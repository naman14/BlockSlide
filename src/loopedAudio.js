let tileAudioSources = []
let finalAudioSource = undefined

export const preloadAudio = (url) => {
    var context = new AudioContext();
    var source = context.createBufferSource();
    source.connect(context.destination);

    var request = new XMLHttpRequest();
    request.open('GET', url, true); 
    request.responseType = 'arraybuffer';
    request.send();
}

export const playAudio = (url, isTileAudio)  => {
    if (!isTileAudio) {
        try {
            tileAudioSources.forEach((source) => {
                console.log('stopping tile audio')
                source.stop()
            })
        } catch (e) {}
    }
  
    var context = new AudioContext();
    var source = context.createBufferSource();
    source.connect(context.destination);

    if (isTileAudio) {
        let osc = context.createOscillator();

        let highpassFilter = context.createBiquadFilter();
        highpassFilter.type = "highpass";
        highpassFilter.frequency.value = 126;
        highpassFilter.Q.value = 0.69
        osc.connect(highpassFilter);

        let lowpassFilter = context.createBiquadFilter();
        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.value = 1240;
        lowpassFilter.Q.value = 0.51;
        osc.connect(lowpassFilter);

        osc.start();
    }

    var request = new XMLHttpRequest();
    request.open('GET', url, true); 
    request.responseType = 'arraybuffer';
    request.onload = function() {
        context.decodeAudioData(request.response, function(response) {
            source.buffer = response;
            source.start(0);
            source.loop = true;
        }, function () { console.error('The request failed.'); } );
    }
    request.send();
    if (isTileAudio) {
        tileAudioSources.push(source)
    } else {
        finalAudioSource = source
    }
}

export const stopAllAudio = () => {
    try {
        tileAudioSources.forEach((source) => {
            source.stop()
        })
        if (finalAudioSource && finalAudioSource) {
            finalAudioSource.stop()
        }
    } catch (e) {}
}