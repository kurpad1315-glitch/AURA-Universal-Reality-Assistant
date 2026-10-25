/* ==========================================
   AURA — UNIVERSAL REALITY ASSISTANT
   Camera + Voice + AI Scene Analysis
========================================== */

"use strict";

/* ==========================================
   DOM ELEMENTS
========================================== */

const voiceCore = document.getElementById("voiceCore");
const voiceStatus = document.getElementById("voiceStatus");
const voiceHint = document.getElementById("voiceHint");

const languageSelect = document.getElementById("languageSelect");

const cameraFeed = document.getElementById("cameraFeed");
const cameraStatus = document.getElementById("cameraStatus");

const seeButton = document.getElementById("seeButton");
const goButton = document.getElementById("goButton");
const stopCameraButton = document.getElementById("stopCameraButton");

const seeScreen = document.getElementById("seeScreen");
const visionMessage = document.getElementById("visionMessage");

let selectedLanguage = "en-IN";

let cameraStream = null;
let cameraIsOpen = false;
let cameraRequestInProgress = false;

let listening = false;
let speaking = false;
let assistantActive = false;

let visionBackendUnavailable = false;


/* ==========================================
   SCREEN STATUS
========================================== */

function updateStatus(title, message) {
    if (voiceStatus) {
        voiceStatus.textContent = title;
    }

    if (voiceHint) {
        voiceHint.textContent = message;
    }
}


/* ==========================================
   VOICE OUTPUT
========================================== */

function speak(text, listenAfter = false) {
    if (!("speechSynthesis" in window)) {
        console.error("AURA: Speech synthesis is unavailable.");
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = selectedLanguage;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice =
        voices.find(v => v.lang === selectedLanguage) ||
        voices.find(v => v.lang.startsWith("en-IN")) ||
        voices.find(v => v.lang.startsWith("en")) ||
        null;

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
        speaking = true;
        updateStatus("AURA speaking", "Please listen.");
    };

    utterance.onend = () => {
        speaking = false;

        if (listenAfter && assistantActive) {
            setTimeout(startListening, 400);
        } else {
            updateStatus("AURA Ready", "You can use the camera or voice assistance.");
        }
    };

    utterance.onerror = event => {
        speaking = false;
        console.error("AURA speech error:", event.error);
    };

    window.speechSynthesis.speak(utterance);
}


/* ==========================================
   CAMERA INITIALIZATION
========================================== */

async function startCamera() {
    if (cameraRequestInProgress) {
        return false;
    }

    if (!cameraFeed) {
        console.error("AURA: #cameraFeed video element is missing.");

        if (cameraStatus) {
            cameraStatus.textContent = "CAMERA ELEMENT MISSING";
        }

        return false;
    }

    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
        console.error("AURA: Camera API is unavailable.");

        if (cameraStatus) {
            cameraStatus.textContent = "CAMERA API UNAVAILABLE";
        }

        if (visionMessage) {
            visionMessage.textContent =
                "Camera access is unavailable. Open AURA using HTTPS in a supported browser.";
        }

        return false;
    }

    // Reuse the existing stream if it is still active.
    if (
        cameraStream &&
        cameraStream.getVideoTracks().some(
            track => track.readyState === "live"
        )
    ) {
        cameraFeed.srcObject = cameraStream;

        try {
            await cameraFeed.play();
            cameraIsOpen = true;

            if (cameraStatus) {
                cameraStatus.textContent = "LIVE CAMERA";
            }

            return true;
        } catch (error) {
            console.error("AURA camera playback error:", error);
        }
    }

    cameraRequestInProgress = true;

    if (cameraStatus) {
        cameraStatus.textContent = "REQUESTING CAMERA...";
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                }
            },
            audio: false
        });

        cameraFeed.srcObject = cameraStream;
        cameraFeed.autoplay = true;
        cameraFeed.playsInline = true;
        cameraFeed.muted = true;

        await cameraFeed.play();

        cameraIsOpen = true;

        if (cameraStatus) {
            cameraStatus.textContent = "LIVE CAMERA";
        }

        if (visionMessage) {
            visionMessage.textContent =
                "Camera active. You can now ask AURA to describe the scene.";
        }

        console.log("AURA: Camera started successfully.");

        updateStatus(
            "SEE MODE",
            "Camera is active. Ask AURA to describe your surroundings."
        );

        return true;

    } catch (error) {
        cameraIsOpen = false;

        console.error(
            "AURA CAMERA ERROR:",
            error.name,
            error.message
        );

        let message = "Unable to open camera.";

        if (error.name === "NotAllowedError") {
            message = "Camera permission denied. Allow camera access in browser settings.";
        } else if (error.name === "NotFoundError") {
            message = "No compatible camera was found.";
        } else if (error.name === "NotReadableError") {
            message = "Camera may be in use by another application.";
        } else if (error.name === "OverconstrainedError") {
            message = "Requested camera configuration is unavailable.";
        }

        if (cameraStatus) {
            cameraStatus.textContent = message;
        }

        if (visionMessage) {
            visionMessage.textContent = message;
        }

        updateStatus("CAMERA ERROR", message);

        return false;

    } finally {
        cameraRequestInProgress = false;
    }
}


/* ==========================================
   STOP CAMERA
========================================== */

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    if (cameraFeed) {
        cameraFeed.pause();
        cameraFeed.srcObject = null;
    }

    cameraIsOpen = false;

    if (cameraStatus) {
        cameraStatus.textContent = "CAMERA STOPPED";
    }

    if (visionMessage) {
        visionMessage.textContent =
            "Camera stopped. Select SEE when you want to start again.";
    }

    console.log("AURA: Camera stopped.");

    updateStatus("AURA Ready", "Camera has been stopped.");
}


/* ==========================================
   CAPTURE CAMERA IMAGE
========================================== */

function captureCameraFrame() {
    if (!cameraFeed || !cameraIsOpen) {
        console.error("AURA: Camera is not open.");
        return null;
    }

    if (!cameraFeed.videoWidth || !cameraFeed.videoHeight) {
        console.error("AURA: Camera video is not ready.");
        return null;
    }

    const canvas = document.createElement("canvas");

    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
        console.error("AURA: Unable to create canvas context.");
        return null;
    }

    context.drawImage(
        cameraFeed,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return canvas.toDataURL("image/jpeg", 0.85);
}


/* ==========================================
   AI SCENE ANALYSIS
========================================== */

async function analyzeCamera(question) {
    if (!cameraIsOpen || !cameraStream) {
        const started = await startCamera();

        if (!started) {
            speak("I could not open the camera. Please check camera permissions.");
            return;
        }
    }

    const image = captureCameraFrame();

    if (!image) {
        speak("The camera image is not ready yet. Please try again.");
        return;
    }

    updateStatus("Analyzing...", "AURA is examining the camera image.");

    if (visionMessage) {
        visionMessage.textContent = "Analyzing the captured scene...";
    }

    try {
        /*
         * This URL must point to your deployed Python backend.
         * The backend must accept JSON containing:
         * { question: "...", image: "data:image/jpeg;base64,..." }
         */
        const response = await fetch(
            "https://aura-universal-reality-assistant.onrender.com/analyze",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question,
                    image: image
                })
            }
        );

        const data = await response.json();

        console.log("AURA AI RESPONSE:", data);

        if (!response.ok) {
            throw new Error(
                data.error || `Backend returned HTTP ${response.status}`
            );
        }

        const answer = data.answer || data.description;

        if (!answer) {
            throw new Error("The backend returned no scene description.");
        }

        if (visionMessage) {
            visionMessage.textContent = answer;
        }

        updateStatus("AURA answered", "Ask another question when ready.");

        speak(answer, true);

    } catch (error) {
        console.error("AURA AI ANALYSIS ERROR:", error);

        if (visionMessage) {
            visionMessage.textContent =
                "AI analysis failed. Check the backend connection and try again.";
        }

        updateStatus(
            "AI SERVICE ERROR",
            "The camera may be working, but scene analysis failed."
        );

        speak(
            "I could not analyze the image. Please check the AI backend connection and try again.",
            false
        );
    }
}


/* ==========================================
   VOICE RECOGNITION
========================================== */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();

    recognition.lang = selectedLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        listening = true;

        updateStatus("Listening...", "Speak naturally. AURA is listening.");

        if (voiceCore) {
            voiceCore.classList.add("listening");
        }
    };

    recognition.onresult = async event => {
        listening = false;

        const command = event.results[0][0].transcript
            .toLowerCase()
            .trim();

        console.log("AURA VOICE COMMAND:", command);

        if (voiceCore) {
            voiceCore.classList.remove("listening");
        }

        await handleCommand(command);
    };

    recognition.onerror = event => {
        listening = false;

        if (voiceCore) {
            voiceCore.classList.remove("listening");
        }

        console.error("AURA SPEECH ERROR:", event.error);

        if (event.error === "not-allowed") {
            updateStatus(
                "MICROPHONE BLOCKED",
                "Allow microphone access in your browser settings."
            );
        }
    };

    recognition.onend = () => {
        listening = false;

        if (voiceCore) {
            voiceCore.classList.remove("listening");
        }

        if (assistantActive && !speaking) {
            setTimeout(startListening, 700);
        }
    };

} else {
    console.warn("AURA: Speech recognition is not supported in this browser.");

    updateStatus(
        "VOICE UNAVAILABLE",
        "Use the on-screen controls or try a supported browser."
    );
}


/* ==========================================
   START LISTENING
========================================== */

function startListening() {
    if (!recognition || listening || speaking || !assistantActive) {
        return;
    }

    try {
        recognition.start();
    } catch (error) {
        console.warn("AURA could not start listening:", error.message);
    }
}


/* ==========================================
   VOICE COMMAND HANDLER
========================================== */

async function handleCommand(command) {
    if (
        command.includes("open camera") ||
        command.includes("start camera") ||
        command.includes("turn on camera") ||
        command === "camera" ||
        command === "see"
    ) {
        const started = await startCamera();

        if (started) {
            speak("The camera is ready. What would you like me to examine?", true);
        }

        return;
    }

    if (
        command === "stop camera" ||
        command === "close camera" ||
        command === "turn off camera"
    ) {
        stopCamera();
        speak("Camera stopped.", true);
        return;
    }

    if (
        command === "stop listening" ||
        command === "goodbye" ||
        command === "stop aura"
    ) {
        assistantActive = false;

        if (recognition && listening) {
            recognition.stop();
        }

        speak("Okay. Voice assistance has stopped.", false);
        return;
    }

    if (
        command === "hello" ||
        command === "hi" ||
        command.includes("hello aura") ||
        command.includes("hi aura")
    ) {
        speak("Hello. I'm AURA. How can I help you?", true);
        return;
    }

    await analyzeCamera(command);
}


/* ==========================================
   START VOICE ASSISTANT
========================================== */

async function startAuraVoiceAssistant() {
    if (!recognition) {
        updateStatus(
            "VOICE UNAVAILABLE",
            "Use the camera and on-screen controls instead."
        );
        return;
    }

    assistantActive = true;

    updateStatus(
        "AURA Ready",
        "Voice assistance is ready. You can also click SEE."
    );

    startListening();
}


/* ==========================================
   LANGUAGE CONTROL
========================================== */

if (languageSelect) {
    languageSelect.addEventListener("change", function () {
        selectedLanguage = this.value;

        if (recognition) {
            recognition.lang = selectedLanguage;
        }

        updateStatus(
            "LANGUAGE UPDATED",
            "Selected language: " + this.options[this.selectedIndex].text
        );

        speak("Language changed to " + this.options[this.selectedIndex].text);
    });
}


/* ==========================================
   CONNECT SEE BUTTON
========================================== */

if (seeButton) {
    seeButton.addEventListener("click", async function () {
        console.log("AURA: SEE button clicked.");

        const started = await startCamera();

        if (started) {
            if (seeScreen) {
                seeScreen.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            updateStatus(
                "SEE MODE",
                "Camera is active. Choose Describe, Path Check, or Read."
            );

            speak("Camera is ready. You can ask me to describe the scene.");
        }
    });
}


/* ==========================================
   STOP CAMERA BUTTON
========================================== */

if (stopCameraButton) {
    stopCameraButton.addEventListener("click", stopCamera);
}


/* ==========================================
   VISION ACTION BUTTONS
========================================== */

document.querySelectorAll(".vision-action").forEach(button => {
    button.addEventListener("click", async function () {
        const title =
            this.querySelector("strong")?.textContent?.trim();

        const prompts = {
            "Describe":
                "Describe the visible scene, objects, people, furniture, and environmental details.",

            "Path Check":
                "Describe visible obstacles and features in the path. Do not claim the path is safe or guarantee obstacle avoidance.",

            "Read":
                "Read any visible text, signs, labels, or notices in the image."
        };

        const question = prompts[title];

        if (!question) {
            console.warn("Unknown AURA vision action:", title);
            return;
        }

        await analyzeCamera(question);
    });
});


/* ==========================================
   GO BUTTON
========================================== */

if (goButton) {
    goButton.addEventListener("click", function () {
        updateStatus(
            "GO MODE",
            "Navigation assistance is a prototype. Continue using your mobility aids."
        );

        speak(
            "Go mode activated. AURA cannot guarantee safe navigation. Please continue using your established mobility aids."
        );
    });
}


/* ==========================================
   BOTTOM NAVIGATION
========================================== */

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", async function () {
        document.querySelectorAll(".nav-item").forEach(nav => {
            nav.classList.remove("active");
        });

        this.classList.add("active");

        const label = this.querySelector("small")
            ?.textContent
            ?.trim()
            .toLowerCase();

        if (label === "home") {
            updateStatus("AURA Ready", "Choose an action or use voice assistance.");
            return;
        }

        if (label === "see") {
            if (seeScreen) {
                seeScreen.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            await startCamera();
            return;
        }

        if (label === "go") {
            updateStatus(
                "GO MODE",
                "AURA provides environmental information, not guaranteed navigation."
            );
            return;
        }

        if (label === "settings") {
            updateStatus(
                "SETTINGS",
                "Choose your assistance language using the language selector."
            );
        }
    });
});


/* ==========================================
   INITIALIZE AURA
========================================== */

window.addEventListener("load", function () {
    console.log("AURA: Application loaded.");

    updateStatus(
        "AURA Ready",
        "Click SEE to open the camera or use voice assistance."
    );

    /*
     * Do not open the camera automatically.
     * The user must click SEE to request permission.
     */
});
