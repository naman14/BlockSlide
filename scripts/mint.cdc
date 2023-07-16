import FlowPuzzleNFT from 0x1b25a8536e63a7da
import NonFungibleToken from 0x1b25a8536e63a7da
import MetadataViews from 0x1b25a8536e63a7da

transaction(){
    let recipientCollection: &FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic}

    prepare(signer: AuthAccount){

        if signer.borrow<&FlowPuzzleNFT.Collection>(from: FlowPuzzleNFT.CollectionStoragePath) == nil {
            signer.save(<- FlowPuzzleNFT.createEmptyCollection(), to: FlowPuzzleNFT.CollectionStoragePath)
            signer.link<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic, MetadataViews.ResolverCollection}>(FlowPuzzleNFT.CollectionPublicPath, target: FlowPuzzleNFT.CollectionStoragePath)
        }

        self.recipientCollection = signer.getCapability(FlowPuzzleNFT.CollectionPublicPath)
                            .borrow<&FlowPuzzleNFT.Collection{FlowPuzzleNFT.FlowPuzzleNFTCollectionPublic}>()!
    }

    execute{
        FlowPuzzleNFT.verifyAndMintNFT(recipient: self.recipientCollection, moves: [1,6,7,1,8,9,2,5,0,6,6,0,2,6,6,8], shuffleIterationCount: 2)
    }
}