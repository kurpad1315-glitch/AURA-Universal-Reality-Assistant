/* ==========================================
   AURA OFFLINE DEMO VISION
========================================== */

function demoVisionResponse(question) {
    const q = String(question || "").toLowerCase();
    let answer = "";

    if (
        q.includes("what is in front") ||
        q.includes("what do you see") ||
        q.includes("describe") ||
        q.includes("surrounding")
    ) {
        answer =
            "The AI vision service is currently unavailable, " +
            "so I cannot reliably identify the objects in this image. " +
            "Please try again when the vision service is connected.";

    } else if (
        q.includes("person") ||
        q.includes("people") ||
        q.includes("someone")
    ) {
        answer =
            "I cannot confirm whether a person is present " +
            "because the vision service is unavailable.";

    } else if (
        q.includes("chair") ||
        q.includes("seat")
    ) {
        answer =
            "I cannot reliably identify seating because " +
            "the vision service is unavailable.";

    } else if (
        q.includes("path") ||
        q.includes("clear") ||
        q.includes("obstacle")
    ) {
        answer =
            "I cannot verify whether your path is clear. " +
            "Please use your established mobility aids " +
            "and seek assistance when needed.";

    } else if (
        q.includes("read") ||
        q.includes("text") ||
        q.includes("sign") ||
        q.includes("board")
    ) {
        answer =
            "The vision service is unavailable, so I cannot " +
            "read the text in the camera image right now.";

    } else if (
        q.includes("color") ||
        q.includes("colour")
    ) {
        answer =
            "I cannot reliably identify the color because " +
            "the vision service is unavailable.";

    } else {
        answer =
            "The camera may be working, but the AI vision service " +
            "is unavailable. Please try again shortly.";
    }

    if (typeof updateStatus === "function") {
        updateStatus(
            "VISION UNAVAILABLE",
            "Check the AI backend connection."
        );
    }

    if (typeof speak === "function") {
        speak(answer, false);
    }

    console.warn(
        "AURA: Offline fallback used; no image analysis was performed."
    );
}


/* ==========================================
   AURA CAMERA HELPERS
========================================== */

async function ensureAuraCamera() {
    const video = document.getElementById("cameraFeed");
    const status = document.getElementById("cameraStatus");

    if (!video) {
        console.error(
            "AURA: The video element #cameraFeed was not found."
        );

        if (status) {
            status.textContent = "CAMERA ELEMENT NOT FOUND";
        }

        return false;
    }

    if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
        console.error(
            "AURA: Camera API unavailable. Check HTTPS and browser support."
        );

        if (status) {
            status.textContent = "CAMERA API UNAVAILABLE";
        }

        return false;
    }

    // Reuse an existing active stream.
    if (
        video.srcObject &&
        video.srcObject.getVideoTracks().some(
            track => track.readyState === "live"
        )
    ) {
        try {
            await video.play();

            if (status) {
                status.textContent = "LIVE CAMERA";
            }

            if (typeof cameraIsOpen !== "undefined") {
                cameraIsOpen = true;
            }

            return true;
        } catch (error) {
            console.error("AURA camera playback error:", error);
        }
    }

    if (status) {
        status.textContent = "REQUESTING CAMERA...";
    }

    try {
        if (typeof startCamera !== "function") {
            throw new Error(
                "startCamera() is missing. Check app.js for syntax errors."
            );
        }

        const result = await startCamera();

        const stream = video.srcObject;

        if (
            result === false ||
            !stream ||
            !stream.getVideoTracks().some(
                track => track.readyState === "live"
            )
        ) {
            if (status && !status.textContent.includes("ERROR")) {
                status.textContent = "CAMERA FAILED TO START";
            }

            return false;
        }

        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;

        await video.play();

        if (status) {
            status.textContent = "LIVE CAMERA";
        }

        if (typeof cameraIsOpen !== "undefined") {
            cameraIsOpen = true;
        }

        console.log("AURA: Camera is live.");

        return true;

    } catch (error) {
        console.error(
            "AURA CAMERA ERROR:",
            error.name,
            error.message
        );

        if (status) {
            status.textContent =
                (error.name || "CAMERA ERROR") +
                ": " +
                (error.message || "Unable to open camera");
        }

        return false;
    }
}


/* ==========================================
   AURA OFFLINE CAMERA CLEANUP
========================================== */

function stopAuraCamera() {
    const video = document.getElementById("cameraFeed");

    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    if (typeof cameraStream !== "undefined") {
        cameraStream = null;
    }

    if (typeof cameraIsOpen !== "undefined") {
        cameraIsOpen = false;
    }

    if (video) {
        video.pause();
    }

    const status = document.getElementById("cameraStatus");

    if (status) {
        status.textContent = "CAMERA STOPPED";
    }

    console.log("AURA: Camera stopped.");
}


/* ==========================================
   AURA QUICK ACTIONS + NAVIGATION
========================================== */

const seeButton = document.getElementById("seeButton");
const goButton = document.getElementById("goButton");
const seeScreen = document.getElementById("seeScreen");


/* GO BUTTON */

if (goButton) {
    goButton.addEventListener("click", function () {
        console.log("AURA: GO selected.");

        if (typeof updateStatus === "function") {
            updateStatus(
                "GO MODE",
                "Tell me where you want to go."
            );
        }

        if (typeof speak === "function") {
            speak(
                "Go mode activated. Tell me where you want to go.",
                true
            );
        }
    });
}


/* ==========================================
   SEE SCREEN ACTIONS
========================================== */

document.querySelectorAll(".vision-action").forEach(function (button) {
    button.addEventListener("click", async function () {
        const title =
            this.querySelector("strong")?.textContent?.trim() || "";

        console.log("AURA VISION ACTION:", title);

        const cameraReady = await ensureAuraCamera();

        if (!cameraReady) {
            if (typeof speak === "function") {
                speak(
                    "I could not open the camera. Please check camera permissions.",
                    false
                );
            }

            return;
        }

        let question = "";

        if (title === "Describe") {
            question =
                "Describe the visible surroundings, objects, people, " +
                "furniture, and environmental details.";
        } else if (title === "Path Check") {
            question =
                "Describe visible obstacles and features in the path. " +
                "Do not assume that the path is safe.";
        } else if (title === "Read") {
            question =
                "Read visible text, signs, labels, or notices in the image.";
        } else {
            return;
        }

        if (typeof analyzeCamera === "function") {
            await analyzeCamera(question);
        } else {
            console.error("AURA: analyzeCamera() is missing.");
            demoVisionResponse(question);
        }
    });
});


/* ==========================================
   BOTTOM NAVIGATION
========================================== */

const navItems = document.querySelectorAll(".nav-item");

navItems.forEach(function (item) {
    item.addEventListener("click", async function () {
        navItems.forEach(function (nav) {
            nav.classList.remove("active");
        });

        this.classList.add("active");

        const label =
            this.querySelector("small")?.textContent
                ?.toLowerCase()
                .trim();

        console.log("AURA NAVIGATION:", label);

        if (label === "home") {
            if (typeof updateStatus === "function") {
                updateStatus(
                    "AURA Ready",
                    "Speak naturally. I'm listening."
                );
            }

            if (typeof speak === "function") {
                speak("Home. I'm ready to assist you.", true);
            }

            return;
        }

        if (label === "see") {
            if (seeScreen) {
                seeScreen.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

            const cameraReady = await ensureAuraCamera();

            if (!cameraReady) {
                return;
            }

            if (typeof updateStatus === "function") {
                updateStatus(
                    "SEE MODE",
                    "AURA is ready to examine your surroundings."
                );
            }

            if (typeof speak === "function") {
                speak(
                    "See mode activated. Ask me what you want me to see.",
                    true
                );
            }

            return;
        }

        if (label === "go") {
            if (typeof updateStatus === "function") {
                updateStatus(
                    "GO MODE",
                    "Tell me where you want to go."
                );
            }

            if (typeof speak === "function") {
                speak(
                    "Go mode activated. Tell me where you want to go.",
                    true
                );
            }

            return;
        }

        if (label === "settings") {
            if (typeof updateStatus === "function") {
                updateStatus(
                    "SETTINGS",
                    "AURA settings are ready."
                );
            }

            if (typeof speak === "function") {
                speak(
                    "Settings. Voice-first accessibility is active.",
                    false
                );
            }
        }
    });
});


/* ==========================================
   STOP CAMERA BUTTON
========================================== */

const stopCameraButton =
    document.getElementById("stopCameraButton");

if (stopCameraButton) {
    stopCameraButton.addEventListener(
        "click",
        stopAuraCamera
    );
}
