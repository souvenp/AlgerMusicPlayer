const layoutRouter = [
  {
    path: '/',
    name: 'home',
    meta: {
      title: 'comp.home',
      icon: 'icon-Home',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/home/index.vue')
  },
  {
    path: '/search',
    name: 'search',
    meta: {
      title: 'comp.search',
      noScroll: true,
      icon: 'icon-Search',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/search/index.vue')
  },
  {
    path: '/favorite-artists',
    name: 'favoriteArtists',
    meta: {
      title: '喜欢的歌手', // 这里之后可以换成i18n的key
      icon: 'ri-user-star-line', // 找一个合适的Remix Icon
      keepAlive: true,
      isMobile: false // 这个复杂布局可能不适合移动端，先禁用
    },
    component: () => import('@/views/favoriteArtists/index.vue')
  },
  {
    path: '/list',
    name: 'list',
    meta: {
      title: 'comp.list',
      icon: 'icon-Paper',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/list/index.vue')
  },
  {
    path: '/toplist',
    name: 'toplist',
    meta: {
      title: 'comp.toplist',
      icon: 'ri-bar-chart-grouped-fill',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/toplist/index.vue')
  },
  {
    path: '/mv',
    name: 'mv',
    meta: {
      title: 'comp.mv',
      icon: 'icon-recordfill',
      keepAlive: true,
      isMobile: false
    },
    component: () => import('@/views/mv/index.vue')
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/historyAndFavorite/index.vue'),
    meta: {
      title: 'comp.history',
      icon: 'icon-a-TicketStar',
      keepAlive: true
    }
  },
  {
    path: '/user',
    name: 'user',
    meta: {
      title: 'comp.user',
      icon: 'icon-Profile',
      keepAlive: true,
      noScroll: true,
      isMobile: true
    },
    component: () => import('@/views/user/index.vue')
  },
  {
    path: '/set',
    name: 'set',
    meta: {
      title: 'comp.settings',
      icon: 'ri-settings-3-fill',
      keepAlive: true,
      noScroll: true,
      back: true
    },
    component: () => import('@/views/set/index.vue')
  }
];
export default layoutRouter;
