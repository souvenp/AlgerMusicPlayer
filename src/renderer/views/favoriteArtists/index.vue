<template>
  <div class="favorite-artists-page">
    <div class="page-header">
      <h1 class="page-title">我喜欢的歌手</h1>
    </div>
    <n-scrollbar class="page-content" v-if="!loading && favoriteArtists.length > 0">
      <div class="artists-list-container">
        <div
            v-for="artist in favoriteArtists"
            :key="artist.id"
            class="artist-card"
            :data-artist-id="artist.id"
        >
          <!-- 左侧歌手信息 -->
          <div class="artist-info-panel">
            <n-avatar :src="getImgUrl(artist.picUrl, '200y200')" :size="80" round
                      class="cursor-pointer transition-transform hover:scale-105"
                      @click="navigateToArtist(artist.id)" />
            <h2 class="artist-name cursor-pointer hover:text-green-500" @click="navigateToArtist(artist.id)">
              {{ artist.name }}
              <span v-if="artist.trans" class="artist-trans">({{ artist.trans }})</span>
            </h2>
            <p class="artist-stats">{{ artist.albumSize }} 张专辑</p>
          </div>

          <!-- 右侧歌曲列表 -->
          <div class="songs-panel">
            <div v-if="artist.songsLoading" class="songs-loading">
              <n-spin />
            </div>
            <n-scrollbar v-else-if="artist.songs && artist.songs.length > 0" class="songs-scrollbar">
              <div class="songs-list">
                <song-item
                    v-for="(song, index) in artist.songs"
                    :key="song.id"
                    :item="song"
                    :index="index"
                    :hide-artist="false"
                    @play="playArtistSong(artist, song)"
                />
              </div>
            </n-scrollbar>
            <div v-else class="songs-empty">
              没有找到热门歌曲
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
    <div v-if="loading" class="page-loading">
      <n-spin size="large" />
    </div>
    <div v-if="!loading && favoriteArtists.length === 0" class="page-empty">
      <n-empty description="你还没有关注任何歌手" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onActivated, nextTick, onUnmounted, onDeactivated } from 'vue';
import { getArtistTopSongs } from '@/api/artist';
import { getFollowedArtists } from '@/api/user';
import { usePlayerStore } from '@/store';
import SongItem from '@/components/common/SongItem.vue';
import { getImgUrl } from '@/utils';
import { SongResult } from '@/types/music';
import { getMusicDetail } from "@/api/music";
import { useArtist } from '@/hooks/useArtist';

defineOptions({
  name: 'FavoriteArtists'
});

const playerStore = usePlayerStore();
const favoriteArtists = ref<any[]>([]);
const loading = ref(true);
const { navigateToArtist } = useArtist();
let observer: IntersectionObserver | null = null;

// 新增：只为单个进入视野的歌手加载歌曲
const fetchSongsForArtist = async (artist: any) => {
  // 如果已经加载过或正在加载，则跳过
  if (artist.songsFetched || artist.songsLoading) return;

  artist.songsLoading = true;
  try {
    const songsRes = await getArtistTopSongs({ id: artist.id, crypto: 'weapi' });
    if (songsRes.data && songsRes.data.songs) {
      const songIds = songsRes.data.songs.map(song => song.id);
      if (songIds.length > 0) {
        const detailRes = await getMusicDetail(songIds);
        if (detailRes.data && detailRes.data.songs) {
          artist.songs = detailRes.data.songs.map(song => ({
            ...song,
            picUrl: song.al.picUrl,
          }));
        } else {
          artist.songs = [];
        }
      } else {
        artist.songs = [];
      }
    }
  } catch (error) {
    console.error(`获取歌手 ${artist.name} 的热门歌曲失败:`, error);
    artist.songs = [];
  } finally {
    artist.songsLoading = false;
    artist.songsFetched = true; // 标记为已加载
  };
};

// 修改：只获取歌手列表，并设置观察者
const fetchFavoriteArtists = async () => {
  try {
    loading.value = true;
    const res = await getFollowedArtists();
    if (res.data && res.data.data) {
      favoriteArtists.value = res.data.data.map(artist => ({
        ...artist,
        songs: [],
        songsLoading: false, // 初始状态为 false
        songsFetched: false, // 新增状态，标记是否已获取
      }));

      const artistIds = res.data.data.map((artist: any) => artist.id);
      playerStore.followedArtistIds = new Set(artistIds);

      // 立即加载前3个歌手的歌曲
      favoriteArtists.value.slice(0, 3).forEach(fetchSongsForArtist);

      // 设置观察者来懒加载其余歌手
      setupObserver();
    };
  } catch (error) {
    console.error("获取关注歌手列表失败:", error);
  } finally {
    loading.value = false;
  };
};

const setupObserver = () => {
  // 清理旧的观察者
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const artistId = Number((entry.target as HTMLElement).dataset.artistId);
        const artist = favoriteArtists.value.find(a => a.id === artistId);
        if (artist) {
          fetchSongsForArtist(artist);
          observer?.unobserve(entry.target); // 加载后停止观察
        }
      }
    });
  }, {
    rootMargin: '200px' // 提前200px开始加载
  });

  nextTick(() => {
    const artistCards = document.querySelectorAll('.artist-card');
    artistCards.forEach((card, index) => {
      // 只观察第4个及之后的卡片
      if (index >= 3) {
        observer?.observe(card);
      }
    });
  });
};

// 优化：如果歌曲已加载，直接播放；否则先加载再播放
const playArtistSong = async (artist: any, clickedSong: SongResult) => {
  try {
    // 如果歌曲列表还未加载，则先加载
    if (!artist.songsFetched) {
      await fetchSongsForArtist(artist);
    }
    if (!artist.songs || artist.songs.length === 0) return;

    // 从已加载的完整列表中找到这首歌
    const fullSongData = artist.songs.find((s: SongResult) => s.id === clickedSong.id);
    if (!fullSongData) {
      throw new Error("无法在已加载列表中找到该歌曲的详细信息");
    }

    playerStore.setPlayList(artist.songs);
    await playerStore.setPlay(fullSongData);
  } catch (error) {
    console.error("播放歌曲失败，获取详细信息时出错:", error);
    // 降级处理，尝试直接播放简略信息
    await playerStore.setPlay({ ...clickedSong, playLoading: false });
  };
};

onMounted(() => {
  fetchFavoriteArtists();
});

// onActivated 逻辑修改，增加缓存判断
onActivated(() => {
  console.log("Favorite Artists page activated");

  // 检查关注列表是否发生变化
  const currentArtistIds = new Set(favoriteArtists.value.map(a => a.id));
  const followedIds = playerStore.followedArtistIds;

  let listsAreSame = currentArtistIds.size === followedIds.size;
  if (listsAreSame) {
    for (const id of currentArtistIds) {
      if (!followedIds.has(id)) {
        listsAreSame = false;
        break;
      }
    }
  }

  // 如果列表没有变化，并且已有数据，则不重新加载
  if (listsAreSame && favoriteArtists.value.length > 0) {
    console.log("关注列表未变化，使用缓存数据。");
    // 重新设置观察者，因为DOM可能已重新渲染
    setupObserver();
    return;
  }

  // 如果列表有变化或无数据，则重新加载
  console.log("关注列表已变化或无数据，重新加载。");
  favoriteArtists.value = []; // 清空数据以确保重新加载和观察
  fetchFavoriteArtists();
});

// 在组件卸载或失活时，断开观察者以避免内存泄漏
onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

onDeactivated(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<style lang="scss" scoped>
.favorite-artists-page {
  @apply h-full w-full flex flex-col;
  @apply bg-light dark:bg-black;
}

.page-header {
  @apply px-4 py-3 flex-shrink-0;
  .page-title {
    @apply text-xl font-bold text-gray-900 dark:text-white;
  }
}

.page-content {
  @apply flex-1 overflow-hidden;
}

.artists-list-container {
  @apply p-4 pt-0 space-y-4;
}

.artist-card {
  @apply flex w-full h-[300px] rounded-2xl overflow-hidden;
  @apply bg-light-100 dark:bg-dark-100;
  @apply border border-gray-200 dark:border-gray-800;
  transition: all 0.3s ease;

  &:hover {
    @apply shadow-lg transform -translate-y-1;
  }
}

.artist-info-panel {
  @apply w-[250px] flex-shrink-0 h-full p-6 flex flex-col items-center justify-center;
  @apply border-r border-gray-200 dark:border-gray-800;

  .artist-name {
    @apply text-lg font-bold mt-4 text-center line-clamp-2;
    .artist-trans {
      @apply text-gray-500 dark:text-gray-400 font-normal ml-1;
    }
  }

  .artist-stats {
    @apply text-xs text-gray-500 dark:text-gray-400 mt-1;
  }
}

.songs-panel {
  @apply flex-1 h-full overflow-hidden;

  .songs-loading, .songs-empty {
    @apply w-full h-full flex items-center justify-center text-gray-400;
  }

  .songs-scrollbar {
    @apply h-full;
  }

  .songs-list {
    @apply p-2;
    // SongItem compact 模式默认有 margin-bottom，这里可以覆盖
    :deep(.compact-song-item) {
      @apply mb-0;
    }
  }
}

.page-loading, .page-empty {
  @apply flex-1 flex items-center justify-center;
}
</style>