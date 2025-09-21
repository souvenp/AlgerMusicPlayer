<template>
  <div class="historic-playlists-page">
    <n-tabs type="line" animated class="h-full flex flex-col">
      <n-tab-pane name="daily" tab="每日推荐历史">
        <n-scrollbar class="playlist-grid-container">
          <div v-if="dailyPlaylists.length === 0" class="empty-state">
            暂无历史每日推荐歌单
          </div>
          <div v-else class="playlist-grid">
            <div
                v-for="playlist in dailyPlaylists"
                :key="playlist.id"
                class="playlist-item"
                @click="openPlaylist(playlist)"
            >
              <div class="playlist-cover">
                <n-image :src="getImgUrl(playlist.coverImgUrl, '200y200')" lazy preview-disabled class="cover-img" />
              </div>
              <div class="playlist-info">
                <div class="playlist-name">{{ playlist.name }}</div>
                <div class="playlist-date">{{ playlist.date }}</div>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </n-tab-pane>
      <n-tab-pane name="radar" tab="私人雷达历史">
        <n-scrollbar class="playlist-grid-container">
          <div v-if="radarPlaylists.length === 0" class="empty-state">
            暂无历史私人雷达歌单
          </div>
          <div v-else class="playlist-grid">
            <div
                v-for="playlist in radarPlaylists"
                :key="playlist.id"
                class="playlist-item"
                @click="openPlaylist(playlist)"
            >
              <div class="playlist-cover">
                <n-image :src="getImgUrl(playlist.coverImgUrl, '200y200')" lazy preview-disabled class="cover-img" />
              </div>
              <div class="playlist-info">
                <div class="playlist-name">{{ playlist.name }}</div>
                <div class="playlist-date">{{ playlist.date }}</div>
              </div>
            </div>
          </div>
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDateFormat } from '@vueuse/core';
import { getImgUrl, isElectron } from '@/utils';
import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { getListDetail } from '@/api/list';

defineOptions({
  name: 'HistoricPlaylists'
});

interface HistoricPlaylist {
  id: string;
  name: string;
  date: string;
  coverImgUrl: string;
  songs: any[];
}

const router = useRouter();
const dailyPlaylists = ref<HistoricPlaylist[]>([]);
const radarPlaylists = ref<HistoricPlaylist[]>([]);

const loadHistoricPlaylists = async () => {
  if (!isElectron) return;
  const result = await window.electron.ipcRenderer.invoke('load-historic-playlists');
  if (result.success) {
    const allPlaylists: HistoricPlaylist[] = result.data;
    dailyPlaylists.value = allPlaylists
        .filter(p => p.id.startsWith('daily_'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    radarPlaylists.value = allPlaylists
        .filter(p => !p.id.startsWith('daily_'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } else {
    console.error("加载历史歌单文件失败:", result.error);
  }
};

const openPlaylist = (playlist: HistoricPlaylist) => {
  console.log("打开本地缓存歌单:", playlist.name);
  const listInfo = {
    id: playlist.id,
    name: playlist.name,
    coverImgUrl: playlist.coverImgUrl,
    trackCount: playlist.songs.length,
    creator: { nickname: '历史记录' },
    description: `于 ${playlist.date} 保存的历史歌单`,
  };

  navigateToMusicList(router, {
    id: playlist.id,
    type: playlist.id.startsWith('daily_') ? 'dailyRecommend' : 'playlist',
    name: playlist.name,
    songList: playlist.songs,
    listInfo: listInfo,
  });
};

onMounted(() => {
  loadHistoricPlaylists();
});
</script>

<style lang="scss" scoped>
.historic-playlists-page {
  @apply h-full p-4;
}

:deep(.n-tabs) {
  .n-tabs-nav {
    @apply pl-2;
  }
  .n-tab-pane {
    @apply h-full;
  }
}

.playlist-grid-container {
  height: calc(100vh - 180px); /* 减去tabs和padding的高度 */
}

.playlist-grid {
  @apply grid gap-4 p-1;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.playlist-item {
  @apply cursor-pointer;
  .playlist-cover {
    @apply relative rounded-lg overflow-hidden aspect-square;
    .cover-img {
      @apply w-full h-full object-cover transition-transform duration-300;
    }
    &:hover .cover-img {
      transform: scale(1.1);
    }
  }
  .playlist-info {
    @apply mt-2;
    .playlist-name {
      @apply text-sm font-medium line-clamp-2 text-gray-800 dark:text-gray-200;
    }
    .playlist-date {
      @apply text-xs text-gray-500 dark:text-gray-400 mt-1;
    }
  }
}

.empty-state {
  @apply h-full flex items-center justify-center text-gray-400;
}
</style>