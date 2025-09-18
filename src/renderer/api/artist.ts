import request from '@/utils/request';

// 获取歌手详情
export const getArtistDetail = (id) => {
  return request.get('/artist/detail', { params: { id } });
};

// 获取歌手热门歌曲
export const getArtistTopSongs = (params) => {
  return request.get('/artist/songs', {
    params: {
      ...params,
      order: 'hot'
    }
  });
};

// 获取歌手专辑
export const getArtistAlbums = (params) => {
  return request.get('/artist/album', { params });
};
/**
 * 关注或取消关注歌手
 * @param id 歌手ID
 * @param t 操作类型, 1 为关注, 0 为取消关注
 */
export const subscribeArtist = (id: number, t: 1 | 0) => {
  return request.post('/artist/sub', {
    id: id,
    t: t
  });
};