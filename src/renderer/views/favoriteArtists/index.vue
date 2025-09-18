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
                    compact
                    :hide-artist="true"
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
import { onMounted, ref, onActivated } from 'vue';
import { getArtistTopSongs } from '@/api/artist';
import { getFollowedArtists } from '@/api/user';
import { usePlayerStore } from '@/store';
import SongItem from '@/components/common/SongItem.vue';
import { getImgUrl } from '@/utils';
import { SongResult } from '@/types/music';
import {getMusicDetail} from "@/api/music";
import { useArtist } from '@/hooks/useArtist';

defineOptions({
  name: 'FavoriteArtists'
});

const playerStore = usePlayerStore();
const favoriteArtists = ref<any[]>([]);
const loading = ref(true);
const { navigateToArtist } = useArtist();

// 获取关注的歌手列表
const fetchFavoriteArtists = async () => {
  try {
    loading.value = true;
    const res = await getFollowedArtists();
    if (res.data && res.data.data) {
      favoriteArtists.value = res.data.data.map(artist => ({
        ...artist,
        songs: [], // 初始化歌曲列表
        songsLoading: true, // 初始化加载状态
      }));
      // 获取到最新列表后，也同步更新 playerStore 中的 ID 集合
      const artistIds = res.data.data.map((artist: any) => artist.id);
      playerStore.followedArtistIds = new Set(artistIds);
      // 逐个获取每个歌手的热门歌曲
      fetchAllArtistSongs();
    }
  } catch (error) {
    console.error("获取关注歌手列表失败:", error);
  } finally {
    loading.value = false;
  }
};

// 获取所有歌手的热门歌曲
const fetchAllArtistSongs = () => {
  favoriteArtists.value.forEach(async (artist) => {
    try {
      // 只调用一次 getArtistTopSongs
      const songsRes = await getArtistTopSongs({ id: artist.id });
      if (songsRes.data && songsRes.data.songs) {
        // 直接使用返回的简化版歌曲列表
        artist.songs = songsRes.data.songs;
      }
    } catch (error) {
      console.error(`获取歌手 ${artist.name} 的热门歌曲失败:`, error);
      artist.songs = [];
    } finally {
      artist.songsLoading = false;
    }
  });
};

// 播放歌手的歌曲
const playArtistSong = async (artist: any, clickedSong: SongResult) => {
  if (!artist.songs || artist.songs.length === 0) return;

  try {
    const detailRes = await getMusicDetail([clickedSong.id as number]);
    if (!detailRes.data?.songs?.[0]) {
      throw new Error("无法获取该歌曲的详细信息");
    }

    const fullSongData = detailRes.data.songs[0];
    const formattedClickedSong: SongResult = {
      ...fullSongData,
      picUrl: fullSongData.al.picUrl,
      song: {
        artists: fullSongData.ar,
        album: fullSongData.al,
        name: fullSongData.name,
        id: fullSongData.id,
      },
      count: fullSongData.count || 0,
    };
    playerStore.setPlayList(artist.songs);
    await playerStore.setPlay(formattedClickedSong);

  } catch (error) {
    console.error("播放歌曲失败，获取详细信息时出错:", error);
    playerStore.setPlay({ ...clickedSong, playLoading: false });
  }
};

onMounted(() => {
  fetchFavoriteArtists();
});
// onActivated 在每次进入被 <keep-alive> 缓存的组件时都会触发
onActivated(() => {
  console.log("Favorite Artists page activated, refreshing data...");
  // 强制刷新列表，以同步最新的关注状态
  fetchFavoriteArtists();
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