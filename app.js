/* ==========================================
   AURA OFFLINE DEMO VISION
========================================== */

function demoVisionResponse(question) {
    const q = question.toLowerCase();
    let answer = "";

    if (
        q.includes("what is in front") ||
        q.includes("what do you see") ||
        q.includes("describe") ||
        q.includes("surrounding")
    ) {
        answer =
            "I can see the camera view. " +
            "The surroundings may contain objects or furniture. " +
            "Please move the camera slowly for a clearer view.";

    } else if (
        q.includes("person") ||
        q.includes("people") ||
        q.includes("someone")
    ) {
        answer =
            "Please point the camera toward the person " +
            "you want me to examine.";

    } else if (
        q.includes("chair") ||
        q.includes("seat")
    ) {
        answer =
            "Please point the camera toward the seating " +
            "area you want me to examine.";

    } else if (
        q.includes("path") ||
        q.includes("clear") ||
        q.includes("obstacle")
    ) {
        answer =
            "I can help examine your surroundings, " +
            "but I cannot guarantee that a path is safe. " +
            "Continue using your established mobility aids.";

    } else if (
        q.includes("read") ||
        q.includes("text") ||
        q.includes("sign") ||
        q.includes("board")
    ) {
        answer =
            "Please point the camera directly at the text " +
            "and keep the camera steady.";

    } else if (
        q.includes("color") ||
        q.includes("colour")
    ) {
        answer =
            "Please point the camera toward the object " +
            "whose color you want to identify.";

    } else {
        answer =
            "Tell me what you want me to examine, " +
            "such as objects, people, signs, or text.";
    }

    updateStatus(
        "SEE MODE",
        "AURA is ready to assist."
    );

    speak(answer, true);
}


/* ==========================================
   AURA QUICK ACTIONS + NAVIGATION
========================================== */

const seeButton = document.getElementById("seeButton");
const goButton = document.getElementById("goButton");
const seeScreen = document.getElementById("seeScreen");

/* SEE button is connected in index.html. */

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

        if (!cameraStream || !cameraIsOpen) {
            const started = await startCamera();

            if (!started) {
                return;
            }
        }

        if (title === "Describe") {

            await analyzeCamera(
                "Describe the visible surroundings, objects, " +
                "people, furniture, and environmental details."
            );

        } else if (title === "Path Check") {

            await analyzeCamera(
                "Describe visible obstacles and features in the " +
                "path. Do not assume that the path is safe."
            );

        } else if (title === "Read") {

            await analyzeCamera(
                "Read visible text, signs, labels, or notices " +
                "in the camera image."
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

        if (label === "see") {

            const started = await startCamera();

            if (!started) {
                return;
            }

            updateStatus(
                "SEE MODE",
                "AURA is ready to examine your surroundings."
            );

            speak(
                "See mode activated. Ask me what you want me to see.",
                true
            );

            return;
        }

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

        if (label === "settings") {

            updateStatus(
                "SETTINGS",
                "AURA settings are ready."
            );

            speak(
                "Settings. Voice-first accessibility is active.",
                false
            );
        }
    });
});
