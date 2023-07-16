import FlowPuzzleNFT from 0xf8d6e0586b0a20c7
import NonFungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

pub fun main(): Bool {
    return FlowPuzzleNFT.isAvailableForSale(tokenId:1)
}