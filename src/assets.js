import { CONTENT_IPFS_URI } from './constants'
import { preloadAudio } from './loopedAudio'

export const tokenMusicUri = (tokenId) => `${CONTENT_IPFS_URI}music/${tokenId}.mp3`

let musicFilesJson = undefined

export const getTokenTileMusic = async (tokenId, callback) => {
    if (!musicFilesJson) {
        let musicFilesUri = CONTENT_IPFS_URI + "music_files.json"
        const response = await fetch(musicFilesUri);
        musicFilesJson = await response.json();
    }
    let tokenMusicFiles = musicFilesJson[tokenId]
    let urls = tokenMusicFiles.map((file) => CONTENT_IPFS_URI + file)
    if (callback) callback(urls)
    return urls
} 

export const preloadAssetsForToken = async (tokenId) => {
    preloadTokenMusic(tokenId)
    preloadTokenTileMusic(tokenId)
}

export const preloadTokenMusic = async (tokenId) => {
    preloadAudio(tokenMusicUri(tokenId))
}

export const preloadTokenTileMusic = async (tokenId) => {
    let tokenTileMusic = await getTokenTileMusic(tokenId)
    tokenTileMusic.forEach((url) => {
        preloadAudio(url)
    })
}