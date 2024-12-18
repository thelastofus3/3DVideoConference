import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { scene, camera, renderer } from "./sceneSetup.js";
import {initializeMouseControl, updateCameraPositionWithCollision} from "./controls.js";
import { loadModel } from "./models.js";
import { initializeAgora } from "./videoSetup.js";

const loadingScreen = document.getElementById("loading-screen");
let loadedObjects = 0;
const totalObjectsToLoad = 2;

function onLoadingComplete() {
    loadedObjects += 1;
    if (loadedObjects === totalObjectsToLoad) {
        loadingScreen.classList.add("hidden");
    }
}

const rotation = { targetX: 0, targetY: 0 };

document.getElementById("container3D").appendChild(renderer.domElement);

initializeMouseControl(rotation);
updateCameraPositionWithCollision();

// Загружаем модели
let room, monitor1, table1, monitor2, table2;
loadModel("models/scene.gltf", [0, 0, 0], scene).then((model) => {
    room = model;
    console.log("Room model loaded");
    onLoadingComplete();
}).catch((error) => {
    console.error("Failed to load room model", error);
});

loadModel("models/monitorForOldRoom.gltf", [0, 0, 0], scene).then((model) => {
    monitor1 = model;
    onLoadingComplete();
});

loadModel("models/table.gltf", [0, 0, 0], scene).then((model) => {
    table1 = model;
    onLoadingComplete();
});

loadModel("models/monitorForOldRoom.gltf", [0, 0, -3], scene).then((model) => {
    monitor2 = model;
    onLoadingComplete();
});

loadModel("models/table.gltf", [0, 0, -3], scene).then((model) => {
    table2 = model;
    onLoadingComplete();
});


function updateMonitorTexture(videoElement, monitor) {
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.flipY = false;

    monitor.traverse((node) => {
        if (node.isMesh && node.material.name === 'ScreenOn') {
            node.material = new THREE.MeshBasicMaterial({ map: videoTexture });
            node.material.needsUpdate = true;
        }
    });
}

document.getElementById("video-agora").addEventListener("click", async () => {
    loadingScreen.classList.add("hidden");

    // const videoElement = await initializeAgora(
    //     "a7802749b2504f27bcbfdae2448638ee", // Ваш App ID
    //     "main", // Канал
    //     sessionStorage.getItem("uid") || String(Math.floor(Math.random() * 10000))
    // );

    // updateMonitorTexture(videoElement);
    const videoElement = await initializeAgora(
        "d31faec490be4c68a3d3c659585719fe", // Ваш App ID
        "main", // Канал
        sessionStorage.getItem("uid") || String(Math.floor(Math.random() * 10000))
    );

    updateMonitorTexture(videoElement);
    document.getElementById("phone-container").style.display = "none";
});

document.getElementById("video-regular").addEventListener("click", () => {
    loadingScreen.classList.add("hidden");

    const videoElement = document.createElement('video');
    videoElement.src = 'models/defaultVideo.mp4'; // Замените на путь к вашему видео
    videoElement.loop = true;
    videoElement.play();

    updateMonitorTexture(videoElement);
    document.getElementById("phone-container").style.display = "none";
});

document.getElementById("upload-video-btn").addEventListener("click", () => {
    document.getElementById("video-upload").click();
});

document.getElementById("video-upload").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
        loadingScreen.classList.add("hidden");

        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(file);
        videoElement.controls = true;
        videoElement.loop = true;
        videoElement.play();

        updateMonitorTexture(videoElement);
        document.getElementById("phone-container").style.display = "none";
    }
});

function animate() {
    requestAnimationFrame(animate);
    updateCameraPositionWithCollision();
    camera.rotation.y = rotation.targetY;
    renderer.render(scene, camera);
}
let rtc = {
    localAudioTrack: null,
    localVideoTrack: null,
    client: null,
};
let options = {
    appId: "a7802749b2504f27bcbfdae2448638ee", // Your app ID
    channel: "main",      // Channel name
    token: null, // Temp token
    uid: sessionStorage.getItem("uid") || String(Math.floor(Math.random() * 10000)),          // User ID
};
// Initialize the AgoraRTC client
function initializeClient() {
    rtc.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setupEventListeners();
}
// Handle remote user events
function setupEventListeners() {
    rtc.client.on("user-published", async (user, mediaType) => {
        await rtc.client.subscribe(user, mediaType);
        console.log("subscribe success");
        if (mediaType === "video") {
            displayRemoteVideo(user);
        }
        if (mediaType === "audio") {
            user.audioTrack.play();
        }
    });
    rtc.client.on("user-unpublished", (user) => {
        const remotePlayerContainer = document.getElementById(user.uid);
        remotePlayerContainer && remotePlayerContainer.remove();
    });
}
// Display remote video
function displayRemoteVideo(user) {
    const remoteVideoTrack = user.videoTrack;
    const remoteVideoElement = document.createElement("video");
    remoteVideoTrack.play(remoteVideoElement);
    updateMonitorTexture(remoteVideoElement, monitor2);
}
// Join a channel and publish local media
async function joinChannel() {
    await rtc.client.join(options.appId, options.channel, options.token, options.uid);
    await createAndPublishLocalTracks();
    displayLocalVideo();
    console.log("Publish success!");
}
// Publish local audio and video tracks
async function createAndPublishLocalTracks() {
    rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
}
// Display local video
function displayLocalVideo() {
    const localVideoElement = document.createElement("video");
    rtc.localVideoTrack.play(localVideoElement);

    // Обновляем текстуру на первом мониторе
    updateMonitorTexture(localVideoElement, monitor1);
}
// Leave the channel and clean up
// Set up button click handlers
function setupButtonHandlers() {
    document.getElementById("video-agora").onclick = joinChannel;
}
// Start the basic call
function startBasicCall() {
    initializeClient();
    window.onload = setupButtonHandlers;
    console.log("call start")
}
startBasicCall();

animate();