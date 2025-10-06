export interface SampleVideo {
  id: string;
  url: string;
  thumbnail: string;
}

export const sampleVideoIds = [
  'VqiPNN4Jblk',
  '84dYijIpWjQ',
  'hp6n1qwo1Ws',
  '7Kh_fpxP1yY',
  'i_mAHOhpBSA'
];

export const sampleVideos: SampleVideo[] = sampleVideoIds.map((id) => ({
  id,
  url: `https://youtu.be/${id}`,
  thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
}));
