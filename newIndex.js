let socket = new io.connect({
    'reconnection': true,
    'reconnectionDelay': 1000,
    'reconnectionDelayMax': 5000,
    'reconnectionAttempts': 9000000
});

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
    socket.emit("serverUpdate", getCookie("server").id)
}

function populateUserInfo() {
    fetch('/api/userDetails').then(response => response.json())
        .then(data => {
            setCookie("userDetails", data)
            socket.emit("userUpdate", data.id)
        });
}
let songQueue = document.getElementById("songQueue")
songQueue.addEventListener("dragstart", function(event) {
    // The dataTransfer.setData() method sets the data type and the value of the dragged data
    event.dataTransfer.setData("Text", event.target.id);
    

    
    // Change the opacity of the draggable element
    event.target.style.opacity = "0.4";
  });


var tempFixFirstQueueUpdate = true //Need to replace this with a GET request, so the website requests the queue the first time, not being sent it-
socket.on('queueUpdate', function (data) {
    let songQueue = document.getElementById("songQueue")
    console.log(data)

    while (songQueue.firstChild) {
        songQueue.removeChild(songQueue.lastChild);
    }

    data.queue.forEach((song, index) => {

        let songDiv = document.createElement("div")
        let songName = document.createElement("span")


        songName.appendChild(document.createTextNode(`${song.title} ${`[${song.author}]` || ""}`));

        songDiv.addEventListener("click", () => {
            scrollQueue(index)
            goSong(index)
        })

        songDiv.draggable = true

        

        songDiv.append(songName)
        songQueue.append(songDiv)
    })

    if (tempFixFirstQueueUpdate) {

        let scrollbacktimer
        songQueue.onscroll = function () {
        clearTimeout(scrollbacktimer)
            scrollbacktimer = setTimeout(() => {
                scrollQueue(data.currentIndex)
                console.log("AUTO SCROLLING QUEUE TO: "+data.currentIndex)
            }, 5000);
        }
        scrollQueue(data.currentIndex)
    }



    function scrollQueue(index) {
        console.log("SCROLLING TO: "+index)

        data.currentIndex = index

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
    tempFixFirstQueueUpdate = false
})



function goSong(index) {
    let guild = getCookie("server")
    fetch("/api/gosong?guild=" + guild.id + "&index=" + index, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
    })
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