export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY


export const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    const hours = parseInt(match?.[1] ?? '0') || 0
    const minutes = parseInt(match?.[2] ?? '0') || 0
    const seconds = parseInt(match?.[3] ?? '0') || 0
    return hours * 3600 + minutes * 60 + seconds
  }
  
  export const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
  
    const parts = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`)
  
    return parts.join(' ')
  }
  
  export const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num)
  }
  
  export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }