var image = new Image();
image.onload = cutImageUp;
image.src = 'https://flovatar.com/api/image/1';

function cutImageUp() {
  const numColsToCut = 3
  const numRowsToCut = 3
  const widthOfOnePiece = 120;
  const heightOfOnePiece = 120;
    var imagePieces = [];
    for(var x = 0; x < numColsToCut; ++x) {
        for(var y = 0; y < numRowsToCut; ++y) {
            var canvas = document.createElement('canvas');
            canvas.width = widthOfOnePiece;
            canvas.height = heightOfOnePiece;
            var context = canvas.getContext('2d');
            context.drawImage(image, x * widthOfOnePiece, y * heightOfOnePiece, widthOfOnePiece, heightOfOnePiece, 0, 0, canvas.width, canvas.height);
            imagePieces.push(canvas.toDataURL());
        }
    }
}