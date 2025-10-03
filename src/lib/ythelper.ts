import { ChannelData } from "./youtube"

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

  // Helper functions for YouTube URL parsing
export function extractVideoId(url: string): string | null {
    const match = url.match(
      /(?:v=|\/?\/(?:embed|shorts|v)\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|\/watch\?.+&v=)([^&?/\n\s]+)/
    )
    return match ? match[1] : null
  }
  
  export function extractChannelId(url: string): string | null {
    // Handle channel URLs in format: https://www.youtube.com/channel/UC...
    const channelRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([^\/\n\s]+)/
    const channelMatch = url.match(channelRegex)
    if (channelMatch) return channelMatch[1]
  
    // Handle custom URLs in format: https://www.youtube.com/c/ChannelName
    const customUrlRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:c|user)\/([^\/\n\s]+)/
    const customMatch = url.match(customUrlRegex)
    if (customMatch) {
      // For custom URLs, we need to make an additional API call to get the channel ID
      return null // Will handle this in the main function
    }
  
    // Handle @username format
    const usernameRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^\/\n\s]+)/
    const usernameMatch = url.match(usernameRegex)
    if (usernameMatch) {
      // For usernames, we need to make an additional API call to get the channel ID
      return null // Will handle this in the main function
    }
  
    return null
  }

  export async function getChannelIdFromUsername(username: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${YOUTUBE_API_BASE_URL}/search?part=snippet&q=${username}&type=channel&key=${YOUTUBE_API_KEY}`
      )
  
      if (!response.ok) {
        throw new Error('Failed to fetch channel ID')
      }
  
      const data = await response.json()
      if (data.items && data.items.length > 0) {
        return data.items[0].snippet.channelId
      }
  
      return null
    } catch (error) {
      console.error('Error getting channel ID from username:', error)
      return null
    }
  }

  export async function fetchChannelData(channelId: string): Promise<ChannelData> {
    const response = await fetch(
      `${YOUTUBE_API_BASE_URL}/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    )
  
    if (!response.ok) {
      throw new Error('Failed to fetch channel data')
    }
  
    const data = await response.json()
  
    if (!data.items || data.items.length === 0) {
      throw new Error('Channel not found')
    }
  
    const channel = data.items[0]
  
    return {
      name: channel.snippet.title,
      username: `@${channel.snippet.customUrl || channel.snippet.title.toLowerCase().replace(/\s+/g, '')}`,
      videosCount: parseInt(channel.statistics.videoCount || '0'),
      subscribers: parseInt(channel.statistics.subscriberCount || '0'),
      totalViews: parseInt(channel.statistics.viewCount || '0'),
      thumbnails: channel.snippet.thumbnails,
      country: channel.snippet.country,
    }
  }