const remote = require("@electron/remote")
const { writeFile } = require("fs")
const { desktopCapturer, Menu } = remote
const videoElement = document.querySelector("video")
const startBtn = document.getElementById("startBtn")
const stopBtn = document.getElementById("stopBtn")
const videoSelectBtn = document.getElementById("videoSelectBtn")
videoSelectBtn.onclick = getVideoSource

startBtn.onclick = startRecording
stopBtn.onclick = stopRecording

stopBtn.disabled = true

async function getVideoSource() {
    const inputSources = await desktopCapturer.getSources({
        types: ["window", "screen"],
    })

    videoOptionMenu = Menu.buildFromTemplate(
        inputSources.map((source) => {
            return {
                label: source.name,
                click: () => selectSource(source),
            }
        })
    )

    videoOptionMenu.popup()
}

let mediaRecorder
const recorderChunks = []

async function selectSource(source) {
    videoSelectBtn.innerText = source.name

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080,
            },
        },
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        videoElement.srcObject = stream
        videoElement.play()

        const options = { mimeType: "video/webm; codecs=vp9" }
        mediaRecorder = new MediaRecorder(stream, options)

        mediaRecorder.ondataavailable = handleDataAvailable
        mediaRecorder.onstop = handleStop

        startBtn.disabled = false
    } catch (e) {
        console.error("Error getting stream:", e)
    }
}

function startRecording() {
    if (!mediaRecorder) {
        console.error(
            "No media recorder available. Please select a source first."
        )
        return
    }

    recorderChunks.length = 0

    mediaRecorder.start(1000)

    startBtn.disabled = true
    stopBtn.disabled = false
    videoSelectBtn.disabled = true

    console.log("Recording started")
}

function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        return
    }

    mediaRecorder.stop()

    startBtn.disabled = false
    stopBtn.disabled = true
    videoSelectBtn.disabled = false

    console.log("Recording stopped")
}

async function handleDataAvailable(e) {
    recorderChunks.push(e.data)
}

async function handleStop(e) {
    const blob = new Blob(recorderChunks, {
        type: "video/webm; codecs=vp9",
    })

    const buffer = Buffer.from(await blob.arrayBuffer())

    const { filePath } = await remote.dialog.showSaveDialog({
        buttonLabel: "Save Video",
        defaultPath: `vid-${Date.now()}.webm`,
    })

    if (filePath) {
        writeFile(filePath, buffer, (err) => {
            if (err) {
                console.error("Failed to save video:", err)
            } else {
                console.log("Video saved successfully to:", filePath)
            }
        })
    } else {
        console.log("User cancelled save dialog")
    }
}
