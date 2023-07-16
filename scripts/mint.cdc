import FlowPuzzleNFT from 0x1b25a8536e63a7da
import NonFungibleToken from 0x631e88ae7f1d7c20
import MetadataViews from 0x631e88ae7f1d7c20

transaction(){
    let recipientCollection: &AnyResource{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount){

        if signer.borrow<&AnyResource>(from: FlowPuzzleNFT.CollectionStoragePath) == nil {
            signer.save(<- FlowPuzzleNFT.createEmptyCollection(), to: FlowPuzzleNFT.CollectionStoragePath)
            signer.link<&AnyResource{NonFungibleToken.CollectionPublic, MetadataViews.ResolverCollection}>(FlowPuzzleNFT.CollectionPublicPath, target: FlowPuzzleNFT.CollectionStoragePath)
        }

        self.recipientCollection = signer.getCapability(FlowPuzzleNFT.CollectionPublicPath)
                            .borrow<&AnyResource{NonFungibleToken.CollectionPublic}>()!
    }

    execute{
        FlowPuzzleNFT.verifyAndMintNFT(recipient: self.recipientCollection, moves: [1,6,7,1,8,9,2,5,0,6,6,0,2,6,6,8], shuffleIterationCount: 2)
    }
}