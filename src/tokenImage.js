
import { CONTENT_IPFS_URI } from "./constants"

export const getImageUrl =  (tokenId) => {
    return CONTENT_IPFS_URI + `${tokenId}.png`
}

export const getAllImages = async () => {
    let images = {}
    for (let i = 1; i< 101; i++) {
        images[i] = CONTENT_IPFS_URI + `${i}.png`
    }
    return images
}