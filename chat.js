/* ==========================================
   ELISA — Fonction serveur (Vercel)
   Relaie les messages vers l'API Claude
   en gardant la clé API secrète.à voir
========================================== */

export default async function handler(req, res) {

    if (req.method !== "POST") {
        res.status(405).json({ error: "Méthode non autorisée" });
        return;
    }

    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Le champ 'messages' est manquant ou vide." });
        return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("ANTHROPIC_API_KEY n'est pas définie dans les variables d'environnement.");
        res.status(500).json({ error: "Clé API non configurée sur le serveur." });
        return;
    }

    try {

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-5",
                max_tokens: 500,
                system:
                    "Tu es Elisa, une assistante IA vocale en français, chaleureuse et naturelle. " +
                    "Tes réponses seront lues à voix haute par une synthèse vocale : reste concise " +
                    "(2 à 4 phrases maximum), parle simplement, sans listes, sans markdown, sans " +
                    "emojis et sans aucun formatage. Réponds toujours en français.",
                messages: messages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Erreur API Anthropic:", response.status, errText);
            res.status(502).json({ error: "Erreur lors de l'appel à Claude." });
            return;
        }

        const data = await response.json();

        const reply =
            (data.content || [])
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join(" ")
                .trim();

        res.status(200).json({ reply: reply || "Désolée, je n'ai pas de réponse à te donner." });

    } catch (error) {
        console.error("Erreur serveur /api/chat :", error);
        res.status(500).json({ error: "Erreur interne du serveur." });
    }

}
