import { BigNumber } from "ethers"
import { bigInt } from './BigInteger.min.js'

export const packMovesToChain = (moves) => {
    console.log(moves)
    let compressedMoves = bigInt(moves.join(''), 5).toString(10)
    console.log(compressedMoves)
    let moveChunks = chunk(compressedMoves.split('').map((item => parseInt(item))), 76)
    let packedMoves = []
    moveChunks.forEach((chunk) => {
        let packedNumber = BigNumber.from(chunk.join(''))
        packedMoves.push(packedNumber)
    })
    console.log(packedMoves)

    return packedMoves
}

export const unpackMovesFromChain = (packedMoves) => {
    let unpackedMoves = []
    packedMoves.map((item => {
        return item.toString()
    })).forEach((moves) => {
        let unpackedMove = bigInt(moves, 10).toString(5)
        unpackedMove.split('').forEach((move) => {
            unpackedMoves.push(move)
        })
    })
    return unpackedMoves
}


function chunk(arr, chunkSize) {
    if (chunkSize <= 0) throw "Invalid chunk size";
    var R = [];
    for (var i=0,len=arr.length; i<len; i+=chunkSize)
      R.push(arr.slice(i,i+chunkSize));
    return R;
  }
