/* ==========================================
   ELISA
   DIAGNOSTIC MICRO + VOIX
========================================== */

"use strict";


/* ==========================================
   CONVERSATION AVEC L'IA
========================================== */

/*
 * Historique envoyé à chaque appel pour que
 * Elisa se souvienne du fil de la discussion.
 */
let conversationHistory = [];

/*
 * Adresse de la fonction serveur qui relaie
 * les messages vers l'API Claude. Fonctionne
 * automatiquement une fois déployé sur Vercel.
 */
const CHAT_ENDPOINT = "/api/chat";


/* ==========================================
   ÉLÉMENTS
========================================== */

const conversation =
    document.getElementById("conversation");

const welcome =
    document.getElementById("welcome");

const microButton =
    document.getElementById("microButton");

const microLabel =
    document.getElementById("microLabel");

const statusText =
    document.getElementById("statusText");

const statusDot =
    document.getElementById("statusDot");

const meterLevel =
    document.getElementById("meterLevel");

const microTestButton =
    document.getElementById("microTestButton");

const voiceTestButton =
    document.getElementById("voiceTestButton");

const recognitionTestButton =
    document.getElementById(
        "recognitionTestButton"
    );

const keyboardButton =
    document.getElementById("keyboardButton");

const textArea =
    document.getElementById("textArea");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const historyButton =
    document.getElementById("historyButton");

const diagnosticButton =
    document.getElementById("diagnosticButton");

const diagnosticModal =
    document.getElementById("diagnosticModal");

const closeDiagnostic =
    document.getElementById("closeDiagnostic");

const diagnosticMicro =
    document.getElementById("diagnosticMicro");

const diagnosticAccess =
    document.getElementById("diagnosticAccess");

const diagnosticRecognition =
    document.getElementById(
        "diagnosticRecognition"
    );

const diagnosticSpeech =
    document.getElementById(
        "diagnosticSpeech"
    );

const diagnosticMessage =
    document.getElementById(
        "diagnosticMessage"
    );


/* ==========================================
   ÉTAT MICRO
========================================== */

let microphoneStream = null;

let audioContext = null;

let analyser = null;

let microphoneSource = null;

let animationFrame = null;

let microphoneActive = false;


/* ==========================================
   RECONNAISSANCE
========================================== */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;

let recognitionAvailable =
    Boolean(SpeechRecognition);

let recognitionRunning = false;


/* ==========================================
   INITIALISATION RECONNAISSANCE
========================================== */

if (recognitionAvailable) {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "fr-FR";

    recognition.continuous =
        false;

    recognition.interimResults =
        true;

    recognition.maxAlternatives =
        1;


    recognition.onstart = () => {

        recognitionRunning =
            true;

        microButton.classList.add(
            "listening"
        );

        statusDot.classList.add(
            "listening"
        );

        statusText.textContent =
            "Elisa écoute…";

        microLabel.textContent =
            "Je t'écoute…";

    };


    recognition.onresult =
        (event) => {

            let finalText =
                "";

            let interimText =
                "";


            for (
                let i =
                    event.resultIndex;
                i <
                    event.results.length;
                i++
            ) {

                const result =
                    event.results[i];

                const transcript =
                    result[0]
                        .transcript;


                if (
                    result.isFinal
                ) {

                    finalText +=
                        transcript;

                } else {

                    interimText +=
                        transcript;

                }

            }


            if (
                interimText
            ) {

                microLabel.textContent =
                    interimText;

            }


            if (
                finalText.trim()
            ) {

                const text =
                    finalText.trim();

                addMessage(
                    text,
                    "user"
                );

                microLabel.textContent =
                    "Message reçu";

                askElisa(
                    text
                );

            }

        };


    recognition.onerror =
        (event) => {

            recognitionRunning =
                false;

            resetListeningUI();


            let message =
                "Erreur de reconnaissance vocale.";


            if (
                event.error ===
                "not-allowed"
            ) {

                message =
                    "Le navigateur n'autorise pas l'accès au microphone.";

            }

            else if (
                event.error ===
                "no-speech"
            ) {

                message =
                    "Aucune parole détectée.";

            }

            else if (
                event.error ===
                "audio-capture"
            ) {

                message =
                    "Le navigateur ne parvient pas à utiliser le microphone.";

            }

            else if (
                event.error ===
                "network"
            ) {

                message =
                    "La reconnaissance vocale rencontre un problème réseau.";

            }


            setStatusError(
                message
            );

            diagnosticRecognition.textContent =
                "❌ " +
                event.error;

        };


    recognition.onend = () => {

        recognitionRunning =
            false;

        resetListeningUI();

    };

}


/* ==========================================
   MICROPHONe DIRECT
========================================== */

async function startMicrophoneTest() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "getUserMedia indisponible"
            );

        }


        microphoneStream =
            await navigator.mediaDevices
                .getUserMedia({
                    audio: true
                });


        microphoneActive =
            true;


        diagnosticMicro.textContent =
            "✅ Détecté";

        diagnosticAccess.textContent =
            "✅ Autorisé";


        statusDot.classList.remove(
            "error"
        );

        statusText.textContent =
            "Microphone actif 🎤";

        microLabel.textContent =
            "Microphone détecté";


        /*
         * Analyse du niveau sonore.
         */

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();


        analyser =
            audioContext.createAnalyser();

        analyser.fftSize =
            256;


        microphoneSource =
            audioContext
                .createMediaStreamSource(
                    microphoneStream
                );


        microphoneSource.connect(
            analyser
        );


        monitorMicrophone();


    }

    catch (error) {

        console.error(
            "Microphone :",
            error
        );


        microphoneActive =
            false;


        diagnosticMicro.textContent =
            "❌ Échec";

        diagnosticAccess.textContent =
            "❌ Refusé";


        setStatusError(
            "Impossible d'accéder au microphone."
        );

    }

}


/* ==========================================
   MONITOR MICRO
========================================== */

function monitorMicrophone() {

    if (
        !microphoneActive ||
        !analyser
    ) {

        return;

    }


    const data =
        new Uint8Array(
            analyser.fftSize
        );


    analyser.getByteTimeDomainData(
        data
    );


    let total =
        0;


    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const value =
            (data[i] - 128) / 128;

        total +=
            value * value;

    }


    const rms =
        Math.sqrt(
            total /
            data.length
        );


    let percentage =
        Math.min(
            100,
            rms * 500
        );


    meterLevel.style.width =
        percentage + "%";


    animationFrame =
        requestAnimationFrame(
            monitorMicrophone
        );

}


/* ==========================================
   ARRÊT MICRO
========================================== */

function stopMicrophoneTest() {

    microphoneActive =
        false;


    if (
        animationFrame
    ) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame =
            null;

    }


    if (
        microphoneStream
    ) {

        microphoneStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        microphoneStream =
            null;

    }


    if (
        audioContext
    ) {

        audioContext.close();

        audioContext =
            null;

    }


    meterLevel.style.width =
        "0%";

}


/* ==========================================
   BOUTON MICRO
========================================== */

microButton.addEventListener(
    "click",
    async () => {

        if (
            microphoneActive
        ) {

            stopMicrophoneTest();

            if (
                recognitionRunning
            ) {

                recognition.stop();

            }

            resetListeningUI();

            statusText.textContent =
                "Microphone arrêté";

            return;

        }


        /*
         * Première étape :
         * on vérifie que le navigateur
         * peut réellement accéder au micro.
         */

        await startMicrophoneTest();


        /*
         * Ensuite on lance la reconnaissance
         * si elle est disponible.
         */

        if (
            recognition
        ) {

            try {

                recognition.start();

            }

            catch (error) {

                console.warn(
                    error
                );

            }

        }

        else {

            setStatusError(
                "La reconnaissance vocale n'est pas disponible dans ce navigateur."
            );

        }

    }
);


/* ==========================================
   TEST MICRO
========================================== */

microTestButton.addEventListener(
    "click",
    async () => {

        if (
            microphoneActive
        ) {

            stopMicrophoneTest();

            microTestButton.textContent =
                "🎤 Tester le microphone";

            statusText.textContent =
                "Test microphone arrêté";

        }

        else {

            await startMicrophoneTest();

            microTestButton.textContent =
                "🛑 Arrêter le microphone";

        }

    }
);


/* ==========================================
   TEST VOIX
========================================== */

voiceTestButton.addEventListener(
    "click",
    () => {

        speak(
            "Bonjour ! Je suis Elisa. Ma voix fonctionne correctement."
        );

    }
);


/* ==========================================
   SYNTHÈSE VOCALE
========================================== */

function speak(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        diagnosticSpeech.textContent =
            "❌ Indisponible";

        setStatusError(
            "La synthèse vocale n'est pas disponible."
        );

        return;

    }


    diagnosticSpeech.textContent =
        "✅ Disponible";


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        "fr-FR";

    utterance.rate =
        1;

    utterance.pitch =
        1;


    utterance.onstart = () => {

        statusText.textContent =
            "Elisa parle 🔊";

    };


    utterance.onend = () => {

        statusText.textContent =
            "Système prêt";

    };


    utterance.onerror =
        (error) => {

            console.error(
                "Synthèse vocale :",
                error
            );

            setStatusError(
                "La voix n'a pas pu être lancée."
            );

        };


    window.speechSynthesis.speak(
        utterance
    );

}


/* ==========================================
   TEST RECONNAISSANCE
========================================== */

recognitionTestButton.addEventListener(
    "click",
    async () => {

        if (
            !recognition
        ) {

            diagnosticRecognition.textContent =
                "❌ Indisponible";

            setStatusError(
                "Ce navigateur ne fournit pas SpeechRecognition."
            );

            return;

        }


        await startMicrophoneTest();


        try {

            recognition.start();

        }

        catch (error) {

            console.warn(
                error
            );

        }

    }
);


/* ==========================================
   AJOUT MESSAGE
========================================== */

function addMessage(
    text,
    type
) {

    if (
        welcome
    ) {

        welcome.style.display =
            "none";

    }


    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message " +
        type;


    const bubble =
        document.createElement(
            "div"
        );

    bubble.className =
        "message-bubble";


    bubble.textContent =
        text;


    message.appendChild(
        bubble
    );


    conversation.appendChild(
        message
    );


    conversation.scrollTop =
        conversation.scrollHeight;

}


/* ==========================================
   APPEL À L'IA (ELISA)
========================================== */

async function askElisa(userText) {

    conversationHistory.push({
        role: "user",
        content: userText
    });

    statusText.textContent =
        "Elisa réfléchit…";

    microLabel.textContent =
        "Elisa réfléchit…";

    try {

        const response =
            await fetch(CHAT_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: conversationHistory
                })
            });

        if (!response.ok) {

            throw new Error(
                "Réponse serveur invalide (" +
                response.status +
                ")"
            );

        }

        const data =
            await response.json();

        const reply =
            data.reply ||
            "Désolée, je n'ai pas de réponse.";

        conversationHistory.push({
            role: "assistant",
            content: reply
        });

        addMessage(
            reply,
            "assistant"
        );

        speak(
            reply
        );

        statusText.textContent =
            "Système prêt";

        resetListeningUI();

    }

    catch (error) {

        console.error(
            "Erreur askElisa :",
            error
        );

        /*
         * On retire le message utilisateur
         * raté pour ne pas fausser le
         * prochain envoi.
         */

        conversationHistory.pop();

        setStatusError(
            "Impossible de contacter Elisa. Vérifie ta connexion ou la clé API."
        );

        resetListeningUI();

    }

}


/* ==========================================
   TEXTE
========================================== */

function sendText() {

    const text =
        messageInput.value.trim();


    if (
        !text
    ) {

        return;

    }


    addMessage(
        text,
        "user"
    );


    messageInput.value =
        "";


    askElisa(
        text
    );

}


sendButton.addEventListener(
    "click",
    sendText
);


messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            sendText();

        }

    }
);


/* ==========================================
   BOUTON ÉCRIRE
========================================== */

keyboardButton.addEventListener(
    "click",
    () => {

        textArea.classList.toggle(
            "visible"
        );


        if (
            textArea.classList.contains(
                "visible"
            )
        ) {

            messageInput.focus();

        }

    }
);


/* ==========================================
   DIAGNOSTIC
========================================== */

diagnosticButton.addEventListener(
    "click",
    () => {

        diagnosticModal.classList.add(
            "visible"
        );

        diagnosticMessage.textContent =
            "Les résultats apparaîtront ici après les tests.";

        diagnosticMicro.textContent =
            microphoneActive
                ? "✅ Actif"
                : "—";

        diagnosticAccess.textContent =
            microphoneActive
                ? "✅ Autorisé"
                : "—";

        diagnosticRecognition.textContent =
            recognitionAvailable
                ? "✅ Disponible"
                : "❌ Indisponible";

        diagnosticSpeech.textContent =
            "speechSynthesis" in window
                ? "✅ Disponible"
                : "❌ Indisponible";

    }
);


/* ==========================================
   FERMER DIAGNOSTIC
========================================== */

closeDiagnostic.addEventListener(
    "click",
    () => {

        diagnosticModal.classList.remove(
            "visible"
        );

    }
);


diagnosticModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            diagnosticModal
        ) {

            diagnosticModal.classList.remove(
                "visible"
            );

        }

    }
);


/* ==========================================
   HISTORIQUE
========================================== */

historyButton.addEventListener(
    "click",
    () => {

        conversation.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        statusText.textContent =
            "Conversation";

    }
);


/* ==========================================
   ÉTATS
========================================== */

function resetListeningUI() {

    microButton.classList.remove(
        "listening"
    );

    statusDot.classList.remove(
        "listening"
    );

    microLabel.textContent =
        "Appuyer pour parler";

}


function setStatusError(
    message
) {

    statusDot.classList.add(
        "error"
    );

    statusDot.classList.remove(
        "listening"
    );

    statusText.textContent =
        message;

}


/* ==========================================
   DIAGNOSTIC INITIAL
========================================== */

diagnosticRecognition.textContent =
    recognitionAvailable
        ? "✅ Disponible"
        : "❌ Indisponible";


diagnosticSpeech.textContent =
    "speechSynthesis" in window
        ? "✅ Disponible"
        : "❌ Indisponible";


console.log(
    "🤖 Elisa — diagnostic démarré"
);

console.log(
    "SpeechRecognition :",
    recognitionAvailable
);

console.log(
    "SpeechSynthesis :",
    "speechSynthesis" in window
);
