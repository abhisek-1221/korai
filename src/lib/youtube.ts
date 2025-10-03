export interface PlaylistDetails {
    id: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
      standard?: { url: string; width: number; height: number }
      maxres?: { url: string; width: number; height: number }
    }
  }
  
  export interface VideoItem {
    id: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
    }
    channelTitle: string
    publishedAt: string
    duration: number
    viewCount: number
    likeCount: number
  }

  // Channel related interfaces
export interface ChannelData {
    name: string
    username: string
    videosCount: number
    subscribers: number
    subscriberRank?: number
    totalViews: number
    viewsRank?: number
    thumbnails: any
    country?: string
  }
  
  export interface ViewData {
    name: string
    views: number
  }
  
  export interface RecentVideo {
    title: string
    views: number
    uploadTime: string
    thumbnail: string
    videoId: string
    duration: number
    likeCount: number
  }
  
  // Video related interfaces
  export interface VideoData {
    id: string
    title: string
    channel: string
    channelId: string
    views: number
    viewsFormatted: string
    published: string
    description: string
    likes: number
    likesFormatted: string
    comments: number
    commentsFormatted: string
    duration: number
    durationFormatted: string
    thumbnails: any
  }
  
  