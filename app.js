/* ==========================================
   AURA VOICE ENGINE
   Simple + reliable prototype
========================================== */

const voiceCore = document.getElementById("voiceCore");
const voiceStatus = document.getElementById("voiceStatus");
const voiceHint = document.getElementById("voiceHint");

const languageSelect =
    document.getElementById("languageSelect");

let selectedLanguage = "en-IN";

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = false;
let listening = false;
let speaking = false;
let assistantActive = false;

/* ==========================================
   CHECK BROWSER SUPPORT
========================================== */

if (!SpeechRecognition) {

    voiceStatus.textContent = "Voice unavailable";

    voiceHint.textContent =
        "Please use Google Chrome for the voice prototype.";

} else {

    recognition = new SpeechRecognition();

    recognition.lang = selectedLanguage;

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;
}


/* ==========================================
   UPDATE SCREEN
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
   AURA RELIABLE VOICE OUTPUT
========================================== */

let auraVoices = [];

function loadAuraVoices() {

    auraVoices = window.speechSynthesis.getVoices();

    console.log(
        "AURA: Available voices:",
        auraVoices.length
    );
}

loadAuraVoices();

if ("onvoiceschanged" in window.speechSynthesis) {

    window.speechSynthesis.onvoiceschanged =
        loadAuraVoices;

}


function speak(text, listenAfter = false) {

    if (!("speechSynthesis" in window)) {

        console.error(
            "AURA: Speech synthesis is not supported."
        );

        return;

    }

    console.log(
        "AURA SPEAKING:",
        text
    );


    /* Stop any previous speech */

    window.speechSynthesis.cancel();


    /* Make sure Chrome speech engine is awake */

    window.speechSynthesis.resume();


    const utterance =
        new SpeechSynthesisUtterance(text);


    /* Language */

    utterance.lang = "en-IN";


    /* Voice */

    const voices =
        window.speechSynthesis.getVoices();


    const preferredVoice =
        voices.find(voice =>
            voice.lang === "en-IN"
        ) ||
        voices.find(voice =>
            voice.lang.startsWith("en-IN")
        ) ||
        voices.find(voice =>
            voice.lang.startsWith("en-US")
        ) ||
        voices.find(voice =>
            voice.lang.startsWith("en-GB")
        ) ||
        voices.find(voice =>
            voice.lang.startsWith("en")
        );


    if (preferredVoice) {

        utterance.voice = preferredVoice;

        console.log(
            "AURA VOICE:",
            preferredVoice.name,
            preferredVoice.lang
        );

    }


    /* Voice settings */

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;


    utterance.onstart = function () {

        speaking = true;

        console.log(
            "AURA VOICE STARTED"
        );

        updateStatus(
            "AURA speaking",
            "Please listen."
        );

    };


    utterance.onend = function () {

    speaking = false;

    console.log("AURA: Speech finished.");

    updateStatus(
        "Listening",
        "AURA is listening. Speak naturally."
    );

    if (assistantActive) {

        setTimeout(() => {

            if (!speaking && !listening) {
                startListening();
            }

        }, 400);
    }
};

    utterance.onerror = function (event) {

        speaking = false;

        console.error(
            "AURA VOICE ERROR:",
            event.error
        );

    };


    /*
       Small delay prevents Chrome/macOS
       speech engine from silently failing.
    */

    setTimeout(() => {

        window.speechSynthesis.resume();

        window.speechSynthesis.speak(
            utterance
        );

    }, 150);

}


/* ==========================================
   START LISTENING
========================================== */

function startListening() {

    if (!recognition) {

        updateStatus(
            "Voice unavailable",
            "Please use Google Chrome."
        );

        return;

    }


    if (listening || speaking) {
        return;
    }


    try {

        recognition.start();

        listening = true;

        updateStatus(
            "Listening...",
            "Speak naturally. I'm listening."
        );

        if (voiceCore) {
            voiceCore.classList.add("listening");
        }

        console.log("AURA listening...");

    }

    catch (error) {

        console.log(
            "Could not start microphone:",
            error
        );

    }

}


/* ==========================================
   SPEECH RECOGNITION STARTED
========================================== */

if (recognition) {

    recognition.onstart = function () {

        listening = true;

        updateStatus(
            "Listening...",
            "Speak naturally. I'm listening."
        );

        if (voiceCore) {
            voiceCore.classList.add("listening");
        }

        console.log("Microphone active");

    };


    /* ======================================
       USER SPEECH RECEIVED
    ====================================== */

    recognition.onresult = function (event) {

        const text =
            event.results[0][0]
                .transcript
                .toLowerCase()
                .trim();


        console.log(
            "YOU SAID:",
            text
        );


        listening = false;


        if (voiceCore) {
            voiceCore.classList.remove("listening");
        }


        handleCommand(text);

    };


   recognition.onend = function () {

    listening = false;

    if (voiceCore) {
        voiceCore.classList.remove("listening");
    }

    console.log("AURA: Recognition ended.");

    /*
       If AURA is active and not speaking,
       automatically listen again.
    */

    if (assistantActive && !speaking) {

        console.log("AURA: Returning to listening...");

        setTimeout(() => {

            if (assistantActive && !speaking && !listening) {
                startListening();
            }

        }, 500);
    }
};

    /* ======================================
       RECOGNITION ERROR
    ====================================== */

    recognition.onerror = function (event) {

    listening = false;

    if (voiceCore) {
        voiceCore.classList.remove("listening");
    }

    // "aborted" can happen normally when AURA
    // switches between listening and speaking.
    if (event.error === "aborted") {
        console.log("AURA switched voice state.");
        return;
    }

    console.log("VOICE ERROR:", event.error);

    if (event.error === "not-allowed") {

        updateStatus(
            "Microphone blocked",
            "Please allow microphone access in Chrome."
        );

    } else if (event.error === "no-speech") {

        updateStatus(
            "I didn't hear you",
            "I'm ready when you are."
        );

    } else {

        updateStatus(
            "Voice problem",
            "Please try again."
        );

    }

};
}


async function handleCommand(command) {

    console.log("AURA NATURAL QUESTION:", command);
    /* ---------- OPEN CAMERA ---------- */

if (
    command.includes("open camera") ||
    command.includes("start camera") ||
    command.includes("turn on camera") ||
    command === "camera"
) {

    if (!cameraStream) {

        await startCamera();

    }

    speak(
        "Camera is ready. What would you like me to look for?",
        true
    );

    return;
}

    const text = command.toLowerCase().trim();

    /* -----------------------------
       BASIC GREETINGS
    ----------------------------- */

    if (
        text === "hi" ||
        text === "hello" ||
        text === "hey" ||
        text === "hi aura" ||
        text === "hello aura"
    ) {

        speak(
            "Hello. I'm AURA. I'm ready to understand your surroundings.",
            true
        );

        return;
    }


    /* -----------------------------
       STOP COMMAND
    ----------------------------- */

    if (
        text === "stop" ||
        text === "stop listening" ||
        text === "goodbye"
    ) {

        speak(
            "Okay. I'll stop listening.",
            false
        );

        return;
    }


    /* -----------------------------
       EVERYTHING ELSE → VISION AI
    ----------------------------- */

    await analyzeCamera(command);
}




/* ==========================================
   AURA AUTOMATIC VOICE ASSISTANT
========================================== */

let auraVoiceActive = false;
let auraMicrophoneReady = false;


/* ------------------------------------------
   START AURA VOICE ASSISTANT
------------------------------------------ */

async function startAuraVoiceAssistant() {

    console.log("AURA: Starting voice assistant...");

    if (!recognition) {

        console.error(
            "AURA: Speech Recognition is not supported."
        );

        updateStatus(
            "Voice unavailable",
            "Please use Google Chrome."
        );

        return;
    }


    try {

        /* Request microphone permission */

        const audioStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        /* Permission is now granted */

        auraMicrophoneReady = true;

        console.log(
            "AURA: Microphone permission granted."
        );


        /*
           We don't need to keep this
           separate microphone stream.
           SpeechRecognition will use
           the microphone.
        */

        audioStream
            .getTracks()
            .forEach(track => track.stop());


        auraVoiceActive = true;
        assistantActive = true;

console.log(
    "AURA: Continuous voice assistant activated."
);


        updateStatus(
            "Listening",
            "AURA is listening. Speak naturally."
        );


        /*
           Small delay gives the browser
           time to release the permission
           stream before SpeechRecognition
           starts.
        */

        setTimeout(() => {

            startListening();

        }, 500);


    } catch (error) {

        console.error(
            "AURA MICROPHONE ERROR:",
            error
        );


        auraVoiceActive = false;


        updateStatus(
            "Microphone needed",
            "Please allow microphone access for AURA."
        );

    }

}


/* ------------------------------------------
   KEEP AURA LISTENING
------------------------------------------ */

if (recognition) {

    recognition.continuous = false;

}


/* ------------------------------------------
   AUTOMATIC START
------------------------------------------ */

window.addEventListener(
    "load",
    function () {

        console.log(
            "AURA: Website loaded."
        );


        /*
           Start voice automatically
           when AURA opens.
        */

        startAuraVoiceAssistant();

    }
);

/* ==========================================
   INITIAL SCREEN
========================================== */

updateStatus(
    "Hands-free mode",
    "Activate AURA once to begin."
);
/* ==========================================
   AURA LIVE CAMERA
========================================== */

const cameraFeed = document.getElementById("cameraFeed");
const cameraStatus = document.getElementById("cameraStatus");

let cameraStream = null;
let cameraIsOpen = false;
let imageCaptured = false;

async function startCamera() {

    if (!cameraFeed) {
        console.log("Camera element not found.");
        return;
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
        await cameraFeed.play();

        if (cameraStatus) {
            cameraStatus.textContent = "LIVE CAMERA";
        }

        console.log("AURA camera active.");
        cameraIsOpen = true;
imageCaptured = false;

    } catch (error) {

        console.error("Camera access error:", error);

        if (cameraStatus) {
            cameraStatus.textContent = "CAMERA ACCESS NEEDED";
        }

    }
}

/* ==========================================
   AURA CAMERA AI ANALYSIS
========================================== */

function captureCameraFrame() {

    if (!cameraFeed) {
        console.log("Camera feed not found.");
        return null;
    }

    if (!cameraFeed.videoWidth || !cameraFeed.videoHeight) {
        console.log("Camera is not ready yet.");
        return null;
    }

    const canvas = document.createElement("canvas");

    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        cameraFeed,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return canvas.toDataURL("image/jpeg", 0.8);
}



async function analyzeWithAura(question) {

    console.log("AURA QUESTION:", question);

    const image = captureCameraFrame();

    if (!image) {

        speak(
            "I cannot see the camera image yet. Please wait a moment and try again.",
            true
        );

        return;
    }

    updateStatus(
        "Analyzing...",
        "AURA is looking at your surroundings."
    );

    try {

        const response = await fetch("/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                question: question,
                image: image
            })

        });

        const data = await response.json();

        console.log("AURA VISION RESPONSE:", data);

        if (data.error) {

            console.error("AURA AI ERROR:", data.error);

            speak(
                "Sorry, I could not analyze the scene right now.",
                true
            );

            return;
        }

        const answer = data.answer;

        updateStatus(
            "AURA answered",
            "Ask me another question."
        );

        speak(answer, true);

    } catch (error) {

        console.error("VISION REQUEST ERROR:", error);

        speak(
            "I am having trouble connecting to my vision system.",
            true
        );
    }
}
/* ==========================================
   AURA LANGUAGE CONTROL
========================================== */

if (languageSelect) {

    languageSelect.addEventListener(
        "change",
        function () {

            selectedLanguage = this.value;

            if (recognition) {
                recognition.lang = selectedLanguage;
            }

            const languageName =
                this.options[this.selectedIndex].text;

            console.log(
                "AURA LANGUAGE:",
                languageName
            );

            speak(
                "Language changed to " +
                languageName
            );

        }
    );

}
/* ==========================================
   AURA VISION CAPTURE
========================================== */

async function captureCameraFrame() {

    if (!cameraFeed) {
        console.log("Camera feed not found.");
        return null;
    }

    const canvas = document.createElement("canvas");

    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        cameraFeed,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const imageData = canvas.toDataURL(
        "image/jpeg",
        0.8
    );

    console.log("AURA captured camera frame.");

    return imageData;
}

async function analyzeCamera(question) {

    try {

        updateStatus(
            "Analyzing",
            "AURA is looking at your surroundings."
        );

        const image = await captureCameraFrame();

        if (!image) {
            speak("I cannot access the camera right now.");
            return;
        }

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

        console.log(
            "AURA VISION RESPONSE:",
            data
        );

        if (data.answer) {

            speak(
                data.answer,
                true
            );

        } else if (data.error) {

            console.error(
                "VISION ERROR:",
                data.error
            );

            speak(
                "Sorry. I couldn't understand the camera view."
            );

        }

    } catch (error) {

        console.error(
            "AURA VISION CONNECTION ERROR:",
            error
        );

        speak(
            "I'm having trouble connecting to my vision system."
        );
    }
}

/* ==========================================
   AURA QUICK ACTIONS + NAVIGATION
========================================== */

const seeButton = document.getElementById("seeButton");
const goButton = document.getElementById("goButton");
const seeScreen = document.getElementById("seeScreen");

/* SEE BUTTON */
if (seeButton) {
    seeButton.addEventListener("click", async function () {

        console.log("AURA: SEE selected.");

        if (!cameraStream) {
            await startCamera();
        }

        updateStatus(
            "SEE MODE",
            "AURA is ready to understand your surroundings."
        );

        speak(
            "See mode activated. I am ready to describe your surroundings.",
            true
        );
    });
}


/* GO BUTTON */
if (goButton) {
    goButton.addEventListener("click", function () {

        console.log("AURA: GO selected.");

        updateStatus(
            "GO MODE",
            "Tell me where you want to go."
        );

        speak(
            "Go mode activated. Tell me where you want to go.",
            true
        );
    });
}


/* SEE SCREEN ACTIONS */
document.querySelectorAll(".vision-action").forEach(function(button) {

    button.addEventListener("click", async function() {

        const title =
            this.querySelector("strong")?.textContent || "";

        console.log("AURA VISION ACTION:", title);

        if (!cameraStream) {
            await startCamera();
        }

        if (title === "Describe") {

            await analyzeCamera(
                "Describe my surroundings clearly. Tell me about people, objects, obstacles, furniture and the general environment."
            );

        } else if (title === "Path Check") {

            await analyzeCamera(
                "Check whether the path in front of me is clear. Identify obstacles, people, stairs, doors or anything I should be careful about."
            );

        } else if (title === "Read") {

            await analyzeCamera(
                "Read any visible text, signs, boards, labels or notices in the camera view. If there is no readable text, say so."
            );
        }
    });
});


/* BOTTOM NAVIGATION */
const navItems = document.querySelectorAll(".nav-item");

navItems.forEach(function(item) {

    item.addEventListener("click", async function() {

        navItems.forEach(function(nav) {
            nav.classList.remove("active");
        });

        this.classList.add("active");

        const label =
            this.querySelector("small")?.textContent
                ?.toLowerCase()
                .trim();

        console.log("AURA NAVIGATION:", label);


        /* HOME */
        if (label === "home") {

            updateStatus(
                "AURA Ready",
                "Speak naturally. I'm listening."
            );

            speak(
                "Home. I'm ready to assist you.",
                true
            );

            return;
        }


        /* SEE */
        if (label === "see") {

            if (!cameraStream) {
                await startCamera();
            }

            updateStatus(
                "SEE MODE",
                "AURA is ready to see your surroundings."
            );

            speak(
                "See mode activated. Ask me what you want me to see.",
                true
            );

            return;
        }


        /* GO */
        if (label === "go") {

            updateStatus(
                "GO MODE",
                "Tell me where you want to go."
            );

            speak(
                "Go mode activated. Tell me where you want to go.",
                true
            );

            return;
        }


        /* SETTINGS */
        if (label === "settings") {

            updateStatus(
                "SETTINGS",
                "AURA settings are ready."
            );

            speak(
                "Settings. Voice-first accessibility is active.",
                false
            );

            return;
        }

    });

});