const youtubeUrlRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
const validUrlRegex = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
const spotifyRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:(track|playlist|artist|episode|album)\/)((?:\w|-){22})/
const songNameRegex = /\s*\(.*?\)\s*/g;

let promiseResolve, promiseReject;

let YouTubeIframeAPIpromise = new Promise(function (resolve, reject) {
    promiseResolve = resolve;
    promiseReject = reject;
});

function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
  }
  
  function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    //document.body.style.backgroundColor = "white";
  }


let tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementById("player");
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var player;
function onYouTubeIframeAPIReady() {
    console.log("Youtube ready!")
    promiseResolve();
}


let socket = new io.connect({
    'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionDelayMax': 5000,
    'reconnectionAttempts': 9000000
});
//switchColor(false)

function switchColor(change) {
    let randomNum = getCookie("color") || getRandomArbitrary(0.2, 0.8)
    if (change) randomNum = getRandomArbitrary(0.1, 1)
    setCookie("color", randomNum, 90000)
    let cols = document.getElementsByClassName('custom-color');
    for (i = 0; i < cols.length; i++) {
        cols[i].style.backgroundColor = "#" + (Math.floor(randomNum * 16777215).toString(16)).toString(16)
    }
}
document.getElementById("disconnect").style.display = "none"

socket.on("disconnect", (reason) => {
    console.log("client disconnected")
    document.getElementById("disconnect").style.display = "block"
});

socket.io.on("reconnect", (reason) => {
    console.log("client reconnected")
    document.getElementById("disconnect").style.display = "none"
    location.reload()
});

if (getCookie("server")) {
    populateUserInfo()
}

function populateUserInfo() {
    var details = getCookie("userDetails")
    document.title = `${details.username}#${details.discriminator}`
    document.getElementById("name").textContent = `${details.username}#${details.discriminator}`
    document.getElementById("pfp").src = `https://cdn.discordapp.com/avatars/${details.id}/${details.avatar}.png`
    document.getElementById("name").parentElement.style.display = "block"
    fetch('/api/userDetails')
        .then(response => response.json())
        .then(data => {
            setCookie("userDetails", data)
            socket.emit("userUpdate", data.id)
            document.title = `${data.username}#${data.discriminator}`
            document.getElementById("name").textContent = `${data.username}#${data.discriminator}`
            document.getElementById("pfp").src = `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
            document.getElementById("name").parentElement.style.display = "block"

        });
}

function clearQueue() {
    fetch("/api/clearQueue?guild=" + getCookie("server").id, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    })
    console.log("clearing queue and killing player")
    if (player != null) {
        player.destroy();
        player = null;
    }
    clearInterval(progInterval)
clearInterval(durationInterval)
document.getElementById("prog").style.width = "0px"
}

function goSong(index) {
    Loader(true)
    let guild = getCookie("server")
    fetch("/api/gosong?guild=" + guild.id + "&index=" + index, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    }).then(response => {
        Loader(false)
    })
}

document.onkeydown = function (event) {
    if (event.keyCode == 70 && event.ctrlKey) {
        event.preventDefault()
        document.getElementById("search").focus()
    }
}

if (getCookie("platform") == "youtube") {
    document.getElementById("switchPlatformBTN").textContent = "Youtube"
} else {
    document.getElementById("switchPlatformBTN").textContent = "Spotify"
}

function switchPlatform() {
    console.log("Switching Platform!")

    let results = document.getElementById("results")
    while (results.firstChild) {
        results.removeChild(results.lastChild);
    }

    document.getElementById("play").value = ""

    if (getCookie("platform") == "youtube") {
        setCookie("platform", "spotify")
        document.getElementById("switchPlatformBTN").textContent = "Spotify"
    } else {
        setCookie("platform", "youtube")
        document.getElementById("switchPlatformBTN").textContent = "Youtube"
    }
}



function follow() {
    Loader(true)
    fetch("/api/follow?guild=" + getCookie("server").id, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    }).then(response => response.json()).then(data => {
        console.log(data)
        Loader(false)
    })
}

var timeout
document.getElementById("play").oninput = function () {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
        if (getCookie("platform") == "youtube") {
            search("youtube")
        } else {
            search("spotify")
        }
    }, 500);
}

function search(altSearch) {
    if (document.getElementById("play").value.trim() == "") return;
    console.log("PARTIAL: " + document.getElementById("play").value)
    fetch("/api/search?guild=" + getCookie("server").id + "&q=" + document.getElementById("play").value + "&altSearch=" + altSearch, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' },
    }).then(response => response.json())
        .then(data => {
            let results = document.getElementById("results")
            while (results.firstChild) {
                results.removeChild(results.lastChild);
            }
            document.onclick = function (e) {
                document.getElementById("play").value = ""
                while (results.firstChild) {
                    results.removeChild(results.lastChild);
                }
            }

            document.getElementById("play").onkeydown = function (e) {
                if (e.keyCode != 13) return;
                searching = true

                let song;
                if (data.items.length > 0) {
                   song = (data?.items[0]?.external_urls?.spotify) || data.items[0].url
                } else {
                    song = document.getElementById("play").value
                }

                playUrl(song, getCookie("server").id)
                document.getElementById("play").value = ""
                document.getElementById("play").blur()
                while (results.firstChild) {
                    results.removeChild(results.lastChild);
                }
            }

            data.items.forEach((video, index) => {
                let videodiv = document.createElement("div")
                let span = document.createElement("span")
                let img = document.createElement("img")

                let videoName = document.createTextNode(video.title || `${video.name} [${video.artists.map(a => a.name).join(", ")}]`)
                span.appendChild(videoName);

                if (video.bestThumbnail || video?.album?.images[0]?.url) img.src = video?.bestThumbnail?.url || video.album.images[0].url

                videodiv.onclick = function (e) {
                    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    console.log("URL " + video.url)
                    let song = (video?.external_urls?.spotify) || video.url
                    console.log(song)
                    e.stopPropagation()
                    playUrl(song, getCookie("server").id)
                    document.getElementById("play").value = ""
                    document.getElementById("play").blur()
                    while (results.firstChild) {
                        results.removeChild(results.lastChild);
                    }
                }

                videodiv.append(img)
                videodiv.append(span)
                results.append(videodiv)
            })

        })
}

fetch('/api/voiceState?guild=' + getCookie("server").id)
    .then(response => response.json())
    .then(data => {
        var vcDisplay = document.getElementById("vc")

        if (data.channel) {
            getChannel(data.channel, getCookie("server").id).then(data=>{
                vcDisplay.textContent = `#${data.name}`
                vcDisplay.style.display = "inline-block"
            })
        } else vcDisplay.style.display = "none"

        
        setVoiceState({mute: data.selfMute || data.serverMute || data.suppress, deafen: data.selfDeaf || data.serverDeaf})
        
    })

    function setVoiceState({mute, deafen}) {
        console.log("SET VOICE STATE!")
        document.getElementById("mute").style.display = mute ? "none" : "inline-block"
        document.getElementById("unmute").style.display = mute ? "inline-block" : "none"
        document.getElementById("deaf").style.display = deafen ? "none" : "inline-block"
        document.getElementById("undeaf").style.display = deafen ? "inline-block" : "none"
    }

    async function getChannel(id, guildId) {
        let response = await fetch('/api/channel?id=' + id + '&guild=' + guildId)
        let data = await response.json()
        return data;
    }

socket.on('voiceUpdate', function (data) {
    var vcDisplay = document.getElementById("vc")
    if (data.channel) {
        getChannel(data.channel, getCookie("server").id).then(data=>{
            vcDisplay.textContent = `#${data.name}`
            vcDisplay.style.display = "inline-block"
        })
    } else vcDisplay.style.display = "none"

    setVoiceState({mute: data.selfMute || data.serverMute || data.suppress, deafen: data.selfDeaf || data.serverDeaf})
})
var timeout

var progInterval
var durationInterval

var X
var Y
function Loader(visible) {
    if (visible) {
       // loader.style.display = "inline-block"
        document.body.classList.add('waiting')

    } else {
        //loader.style.display = "none"
        document.body.classList.remove('waiting')
        document.body.style.cursor = 'default'
    }
}

/* var loader = document.getElementById("loader")
document.addEventListener('mousemove', e => {
    //if (loader.style.display == "none" || !loader.style.display) return;
    loader.style.left = (e.pageX - (loader.clientWidth/2)) + 'px';
  loader.style.top = (e.pageY - (loader.clientHeight/2)) + 'px'
}) */

function hide() {
    console.log(document.getElementsByClassName("hide"))
    Array.from(document.getElementsByClassName("hide")).forEach(element=>{
        console.log(element)
        if (element.style.display === "none") {
            element.style.display = "block";
          } else {
            element.style.display = "none";
          }
    })
}

function pause(bool) {
    fetch(`/api/pause?guild=${getCookie("server").id}` + (bool ? `&pause=${bool}` : ""), {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    })
}

function sync() {
    fetch('/api/progress?guild=' + getCookie("server").id).then(response => response.json())
    .then(data => {
        player.seekTo(data.progress/1000)
    })
}


clearInterval(progInterval)
clearInterval(durationInterval)
var playerExists = false
var oldId

window.addEventListener("dragover",function(e){
    e.preventDefault();
  });
  window.addEventListener("drop",function(e){
    var data = e.dataTransfer.getData("text");
    if (data.match(validUrlRegex)) {
        data.split("\n").forEach(data=>{
            playUrl(data, getCookie("server").id)
        })
        
        e.preventDefault(); 
    } else if (e.dataTransfer.files.length > 0){
        e.preventDefault(); 
        var files = []

    if (e.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (e.dataTransfer.items[i].kind === 'file') {
            const file = e.dataTransfer.items[i].getAsFile();
            //console.log('... file[' + i + '].name = ' + file.name);
            files.push(file)
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          //console.log('... file[' + i + '].name = ' + e.dataTransfer.files[i].name);
          files.push(e.dataTransfer.files[i])
        }
      }

      if (files) {
          console.log(files)
          const data = new FormData();

          for (const file of files) {
              data.append('files[]', file, file.name);
          }

          fetch("https://music.pixelboop.net/api/upload?guild=" + getCookie("server").id, {
              method: 'POST',
              body: data,
          })
          
      }
    }

    

  });


let songQueue = document.getElementById("songQueue")
songQueue.addEventListener("dragstart", function(event) {
    // The dataTransfer.setData() method sets the data type and the value of the dragged data
    event.target.id = "dragging"
    event.dataTransfer.setData("Text", event.target.id);
    //event.target.style.visibility = "hidden"
});

socket.on('queueUpdate', function (data) {
    if (timeout) {
        console.log("clearing timeout")
        clearInterval(timeout)
    }

    console.log(data)
    

    document.getElementById("following").textContent = data?.following?.nickname || data?.following?.displayName || "Follow"

    if (!data.queue) {
        console.log("Nothing in queue!")
        clearInterval(progInterval)
        clearInterval(durationInterval)
    }

    let songQueue = document.getElementById("songQueue")

    var oldScroll = songQueue.scrollTop

    while (songQueue.firstChild) {
        songQueue.removeChild(songQueue.lastChild);
    }

    if (!data.queue) return;
    data.queue.forEach((song, index) => {
        let songdiv = document.createElement("div")
        let wrapdiv = document.createElement("div")
        let a = document.createElement("a")
        let imgLink = document.createElement("a")
        let img = document.createElement("img")
        let span = document.createElement("span")
        let spanX = document.createElement("span")
        let requesterName = document.createTextNode(`[${song?.requester?.displayName || ""}]`)
        span.appendChild(requesterName);

        let X = document.createTextNode(`❌`)
        spanX.appendChild(X);
        spanX.classList.add('songRemove')

        song.title = song.title.replace(songNameRegex, " ")
        let songName = document.createTextNode(`${song.title}`+(song.author ? `[${song.author}]` : ``))
        a.appendChild(songName);
        a.classList.add('songName')
        imgLink.classList.add('songLogo')
        imgLink.href = song.spotifyUrl || song.url
        imgLink.onclick = function (e) {
            e.stopPropagation();
        }
        img.src = song.spotifyUrl ? "public/assets/spotify.png" : "public/assets/youtube.png"
        imgLink.target = "_blank"
        songdiv.addEventListener("click", () => {
            goSong(index)
            scrollTo(index)
        })
        spanX.addEventListener("click", (e) => {
        e.stopPropagation()
        console.log("DELETE! SONG---------------     "+index)

fetch("/api/song?guild="+getCookie("server").id+"&index="+index, {
                method: "DELETE",
                headers: {'Content-Type': 'application/json'}, 
              }).then(response => response.json()).then(data => {
            console.log(data)
        })

        })
        imgLink.append(img)
        songdiv.append(a)
        songdiv.append(imgLink)
        songdiv.append(spanX)
        songdiv.append(span)
        songdiv.draggable = true
        wrapdiv.ondragover = function(ev) {
            if (ev.target.draggable) {
                ev.preventDefault();
            }
        }
        wrapdiv.addEventListener("dragenter", function(event) {
            if (event.target.draggable) {
                Array.from(event.target.children).forEach(child=>{
                    child.style.pointerEvents = "none"
                })
                event.target.style.border = "3px dotted red";
            }
              
          });
        wrapdiv.addEventListener("dragleave", function(event) {
            if (event.target.draggable) {
                Array.from(event.target.children).forEach(child=>{
                    child.style.pointerEvents = "auto"
                })
                event.target.style.border = "";
            }
              
          });
          wrapdiv.addEventListener("drop", function(event) {
            event.preventDefault();
            event.stopPropagation()
            event.stopImmediatePropagation()
            var data = event.dataTransfer.getData("text");
            console.log("ID: ", data)
            var children = Array.from(songQueue.children)
            var draggedElement = document.getElementById(data)
            var draggedElementIndex = children.indexOf(draggedElement.parentNode)
            var dropIndex = children.indexOf(event.target.parentNode)
            console.log("Index of dragged element: "+draggedElementIndex, "Index of drop position: "+dropIndex)

            fetch("/api/insertQueue?guild="+getCookie("server").id+`&from=${draggedElementIndex}&index=${dropIndex}`, {
                method: "POST",
                headers: {'Content-Type': 'application/json'}, 
              }).then(response => response.json().then(data => {
            console.log(data)
        }))

            console.log(event.target.parentNode)
            Array.from(event.target.children).forEach(child=>{
                child.style.pointerEvents = "auto"
            })
            event.target.style.border = "";
            //event.target.parentNode.appendChild(document.getElementById(data));

            function insertBefore(newNode, existingNode) {
                existingNode.parentNode.insertBefore(newNode, existingNode);
            }
            insertBefore(document.getElementById(data), event.target)
            document.getElementById(data).style.visibility = "block"
            document.getElementById(data).removeAttribute('id');
          })
        wrapdiv.ondrop = function(event) {
            
        }
        wrapdiv.append(songdiv)
        songQueue.append(wrapdiv)
        if (index == data.currentIndex) {

            YouTubeIframeAPIpromise.then(async (event) => {
                console.log("Youtube player created!")
                if (!song.url.match('v=([a-zA-Z0-9_-]+)&?')) return console.log("Not YT vid")
                let id = song.url.match('v=([a-zA-Z0-9_-]+)&?')[1];

                fetch('/api/progress?guild=' + getCookie("server").id).then(response => response.json()).then(data => {
                    createPlayer()

                    function createPlayer() {

                        document.onvisibilitychange = function (event) {
                            if (document.hidden) {
                                console.log('not visible');
    
                                if (player != null) {
                                    //if (id == oldId) return;
                                    //var oldId = id
                                    console.log("PAUSING PLAYER!")
                                    player.pauseVideo()
                                    //player.destroy();
                                    //player = null;
                                }
    
                            } else {
                                console.log('is visible');
                                //oldId = null
                                //createPlayer()
                                console.log("UNPAUSING PLAYER!")
                                player.playVideo()
                                sync()
                            }
                        };

                        console.log(id, oldId, id == oldId)
    
                        if (player != null && oldId != id) {
                            /* console.log("DESTROYING PLAYER!")
                            player.destroy();
                            player = null; */
                            console.log("EEEEEEEEEEEEEEEEEEEE-----------------------------------------------")
                            player.loadVideoById(id)
                            oldId = id
                            return;
                        }

                        
                        
                        if (!player) {
                            oldId = id
                            player = new YT.Player('player', {
                        height: '100%',
                        width: '100%',
                        videoId: id,
                        playerVars: {
                            'playsinline': 1,
                            'mute': 1,
                            'enablejsapi': 1,
                            'disablekb': 1,
                            'controls': 0,
                            'start':Math.round(data.progress/1000),
                            'iv_load_policy': 3,
                            'origin': "https://music.pixelboop.net",
                            'rel': 0,
                            'widget_referrer': "https://music.pixelboop.net",
                            'showinfo': 0,
                            'fs': 0
                        },
                        events: {
                            'onReady': onPlayerReady,
                            'onStateChange': onPlayerStateChange
                        }
                            });
                        }
                    
    
                    var buffering;
                    function onPlayerStateChange(event) {
    
                        if (event.data == YT.PlayerState.BUFFERING) {
                            clearTimeout(buffering)
                            buffering = setTimeout(() => {
                                sync()
                                console.log("FINISHED BUFFERING--------------------------------")
                            }, 5000);
                        }
    
                        if (event.data == YT.PlayerState.PLAYING) {
                            clearTimeout(buffering)
                        }
                    }
                    function onPlayerReady(event) {
                        console.log("START VIDEO")
                        console.log("PLAYER IS READY!!!!!!!!!!!!!!!!!!!!!!!!!")
    
                        playerpromiseResolve()
                        event.target.playVideo();
                        sync()
                    }

                    }



            })

            })

            songdiv.classList.add("currentSong")
            topPos = songdiv.offsetTop;
            divheight = songdiv.clientHeight;


            let playerpromiseResolve, playerpromiseReject;

                        let playerpromise = new Promise(function (resolve, reject) {
                            playerpromiseResolve = resolve;
                            playerpromiseReject = reject;
                        });

                        var Time = new Date()

            fetch('/api/progress?guild=' + getCookie("server").id).then(response => response.json())
                .then(data => {
                    console.log("FETCHED TIME!")
                    console.log("SEC:" + data.progress / 1000)

                    let width = data.progress / (song.length * 1000) * document.getElementById("progBehind").clientWidth
                    document.getElementById("prog").style.width = width + "px"
                    Time.setSeconds(Time.getSeconds() - (data.progress / 1000));

                    clearInterval(progInterval)
                    clearInterval(durationInterval)

                    progInterval = setInterval(function () { move(song, Time) }, 1000 / 30)
                    durationInterval = setInterval(getDuration, 10 * 1000)

                    



                })
            function move() {
                let newduration = (new Date().getTime() - Time.getTime())
                //console.log(newduration)
                let width = lerp(document.getElementById("prog").clientWidth, (newduration / (song.length * 1000)) * document.getElementById("progBehind").clientWidth, 0.1);
                document.getElementById("prog").style.width = width + "px"

                try {
                    
                    if (player.getCurrentTime() < 10) {
                        var blur = (player.getCurrentTime())
                        //console.log("Blur: "+(10/blur))
                        //document.getElementById("backgroundImage").style = `backdrop-filter: blur(${blur}px);`
                        document.getElementById("backgroundImage").style = `backdrop-filter: blur(${10/blur}px);`
                    } else {
                        document.getElementById("backgroundImage").style = "backdrop-filter: blur(0px);"
                    }
                    
                } catch (error) {
                    
                }
                /* try {
                    if (player != null) console.log("PlayerTime: "+player.getCurrentTime() + " / "+ newduration / 1000 + " / " +Math.abs(player.getCurrentTime() - (newduration / 1000)))
                    fetch('/api/progress?guild=' + getCookie("server").id).then(response => response.json())
                    .then(data => {
                        //data.progress = data.progress + (new Date().getSeconds() - time.getSeconds())
                    if (Math.abs(player.getCurrentTime() - (data.progress / 1000)) > 0.2) {
                        console.log("%c---------REALIGNING PROGRESS---------", 'background: #222; color: #da5555')
                        player.seekTo((newduration / 1000))
                    } else {
                        console.log(100 - (player.getCurrentTime() / (newduration / 1000) * 100))
                        player.setPlaybackRate(1 + (100 - (player.getCurrentTime() / (newduration / 1000) * 100)))
                    }
                })

                } catch (error) {
                    
                } */
            }

            let progBar = document.getElementById("prog")
            let timer
            let mouseX
            document.onmousemove = function (event) {
                mouseX = event.clientX
            }
            document.getElementById("progBehind").onmousedown = function (event) {
                console.log("ACTIVATED!")
                progBar.classList.add("dragging")
                document.body.classList.add("disableSelect")
                clearInterval(timeout)

                if (progInterval) clearInterval(progInterval)
                if (durationInterval) clearInterval(durationInterval)

                timer = setInterval(function () {
                    let X = mouseX

                    X = X - document.getElementById("progBehind").getBoundingClientRect().left

                    X = Math.min(Math.max(X, 0), document.getElementById("progBehind").clientWidth)
                    progBar.style.width = X + "px"
                    //progBar.style.width = X+"%"
                }, 10);
                document.onmouseup = function handler(e) {
                    if (timer) clearInterval(timer)
                    progBar.classList.remove("dragging")
                    document.body.classList.remove("disableSelect")

                    clearInterval(progInterval)
                    clearInterval(durationInterval)

                    let X = mouseX
                    X = X - document.getElementById("progBehind").getBoundingClientRect().left
                    X = Math.min(Math.max(X, 0), document.getElementById("progBehind").clientWidth)

                    console.log(X / document.getElementById("progBehind").clientWidth * song.length)

                    fetch("/api/seek?guild=" + getCookie("server").id + "&seconds=" + X / document.getElementById("progBehind").clientWidth * song.length, {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                    })

                    progInterval = setInterval(function () { move(song, Time) }, 1000 / 30)
                    durationInterval = setInterval(getDuration, 10 * 1000)
                    document.onmouseup = ''
                }
            }

        }
    })

    songQueue.scrollTop = oldScroll

    scrollTo(data.currentIndex)

    function scrollTo(index) {
        console.log("SCROLL-BACK")

        var songdiv = Array.from(songQueue.children)[index]
        if (!songdiv) return;
        let topPos = songdiv.offsetTop
        let divheight = songdiv.clientHeight;

        let height = songQueue.clientHeight
        height = height / 2
        songQueue.scrollTop = topPos - height + divheight / 2;

        document.getElementById("search").value = ""
        songdiv?.classList?.remove("currentSearch")
    }

    let scrollbacktimer
    songQueue.onscroll = function (event) {
        clearTimeout(scrollbacktimer)
        scrollbacktimer = setTimeout(() => {
            scrollTo(data.currentIndex)
        }, 5000);
    }

    document.getElementById("search").oninput = function (event) {
        let songQueue = document.getElementById("songQueue")
        var index = data.queue.findIndex(s=> `${s.title} ${s.author}`.toLowerCase().includes(document.getElementById("search").value.toLowerCase()))
        if (!document.getElementById("search").value || index < 0) {
            var songdiv = Array.from(songQueue.children)[data.currentIndex]
            if (!songdiv) return;
            let topPos = songdiv.offsetTop
            let divheight = songdiv.clientHeight;

            let height = songQueue.clientHeight
            height = height / 2
            songQueue.scrollTop = topPos - height + divheight / 2;
            return document.getElementsByClassName("currentSearch")[0]?.classList?.remove("currentSearch");
        }
    var songdiv = Array.from(songQueue.children)[index]
    console.log(index)
    console.log(songdiv)
    document.getElementsByClassName("currentSearch")[0]?.classList?.remove("currentSearch")
    songdiv?.classList?.remove("currentSearch")
    console.log(songdiv || "Cant find search thing")

        songdiv.classList.add("currentSearch")

        document.getElementById("search").onkeypress = function(event) {
            if (event.key === "Enter") {
              event.preventDefault();
              songdiv.click();
            }
          };

    let topPos = songdiv.offsetTop;
    let height = songQueue.clientHeight
    let divheight = songdiv.clientHeight
    height = height / 2
    songQueue.scrollTop = topPos - height + divheight / 2;
    songQueue.onscroll
}

})

let duration = 0
function getDuration() {
    console.log("Updating Song Duration!")
    fetch('/api/progress?guild=' + getCookie("server").id).then(response => response.json())
        .then(data => {
            duration = data.progress
        })
}

var avaliableGuilds;
const guildFetch = new Promise((resolve, reject) => {
    fetch('/api/guilds')
    .then(response => response.json())
    .then(data => {
        console.log("Fetched Initial Avaliable Guilds!")
        avaliableGuilds = data
        resolve();
    }).catch(e => {
        console.log(e)
    })
});
socket.on('updateGuilds', function (data) {
    var server = getCookie("server")
    var updatedServer = data.find(g=> g.id == server.id)
    avaliableGuilds = data

    console.log("Updated Avaliable Guilds!")
    if (!updatedServer) { //Server No Longer Exists
        console.log("Guild no longer exists!")
        openServerSelect()
        return;
    }

    document.getElementById("serverbtn").textContent = updatedServer.name
    setCookie("server", updatedServer)
})

let cachedGuild = getCookie("server")
if (cachedGuild) {
    changeGuild(cachedGuild)

    fetch('/api/guilds?guildId=' + getCookie("server").id)
        .then(response => response.json())
        .then(guild => {
            if (guild.error) return console.error(guild.error)
            console.log("Fetched Guild: " + guild.name)
            changeGuild(guild)
        })

} else {
    openServerSelect()
}




async function openServerSelect() {
    let serversDiv = document.getElementById("servers")

    if (getCookie("server")) document.getElementById("serverSelect").onclick = function() {
        document.getElementById("serverSelect").style.display = "none"
    }

    await guildFetch;

    while (serversDiv.firstChild) {
        serversDiv.removeChild(serversDiv.lastChild);
    }

    if (avaliableGuilds.length == 1) {
        setCookie("server", avaliableGuilds[0])
        populateSpotifyPlaylists()
        populateUserInfo()
    } else if (avaliableGuilds.length == 0) {
        let serverdiv = document.createElement("div")
        let p = document.createElement("p")
        p.appendChild("Join a server /w the musicbot");
        serverdiv.append(p)
        serversDiv.append(serverdiv)
    } else {
        var index = 0
        avaliableGuilds.forEach(guild => {
            if (guild.id == getCookie("server").id) return;
            let serverdiv = document.createElement("div")
            let p = document.createElement("p")
            let guildName = document.createTextNode(guild.name)
            p.appendChild(guildName);
            serverdiv.append(p)
            serverdiv.addEventListener("click", () => {
                setCookie("server", guild)
                changeGuild(guild)
            });
            serverdiv.style = `animation-delay: ${(index*0.1)}s`
            serversDiv.append(serverdiv)
            index++
        })
    }

    document.getElementById("serverSelect").style.display = "block"
}
function changeGuild(guild) {
    populateSpotifyPlaylists()
    populateUserInfo()

    if (player != null) {
        player.destroy();
        player = null;
    }

    clearInterval(progInterval)
    clearInterval(durationInterval)
    document.getElementById("prog").style.width = "0px"

    document.getElementById("serverbtn").textContent = guild.name
    socket.emit("serverUpdate", guild.id)
    document.getElementById("serverSelect").style.display = "none"
}
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end
}

function populateSpotifyPlaylists() {

    fetch('/api/spotifyPlaylists?guild=' + getCookie("server").id)
        .then(response => response.json())
        .then(data => {
            let spotifyPlaylist = document.getElementById("spotifyPlaylist")
            if (data.items.length == 0) return document.getElementById("spDrop").style.display = "none"

            document.getElementById("spDrop").style.display = "block"
            
            while (spotifyPlaylist.firstChild) {
                spotifyPlaylist.removeChild(spotifyPlaylist.lastChild);
            }

            let topPos
            let divheight
            data.items.forEach((playlist, index) => {
                let songdiv = document.createElement("div")
                
                let a = document.createElement("a")
                let span = document.createElement("span")
                let songName = document.createTextNode(playlist.name)
                a.appendChild(songName);
                songdiv.addEventListener("click", () => {
                    playUrl(playlist.external_urls.spotify, getCookie("server").id)
                })
                songdiv.append(a)
                songdiv.append(span)
                spotifyPlaylist.append(songdiv)
            })

            let height = spotifyPlaylist.clientHeight
            height = height / 2
            spotifyPlaylist.scrollTop = topPos - height + divheight / 2;
        })
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function setCookie(cname, cvalue, exdays) {
    if (typeof cvalue === 'object' && cvalue !== null) cvalue = JSON.stringify(cvalue)
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            try {
                return JSON.parse(c.substring(name.length, c.length));
            } catch (e) {
                return c.substring(name.length, c.length);
            }
        }
    }
    return "";
}


async function playUrl(url, serverId) {
    Loader(true)
    let res = await fetch("/api/playUrl?guild=" + serverId + "&url=" + url, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    }).then(()=>{
        Loader(false)
    })
    return res
}