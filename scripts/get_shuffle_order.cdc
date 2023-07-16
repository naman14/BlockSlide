import FlowPuzzleNFT from 0xf8d6e0586b0a20c7
import NonFungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

pub fun main(): FlowPuzzleNFT.ShuffleInfo {
    let shuffleInfo = FlowPuzzleNFT.getShuffledNumbersForToken(tokenId:1)
    return shuffleInfo
}