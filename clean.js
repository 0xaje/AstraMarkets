const fs = require('fs');

function cleanFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Rename variables/functions
    content = content.replace(/addConsciousnessLog/g, 'addSystemLog');
    content = content.replace(/renderConsciousnessLogs/g, 'renderSystemLogs');
    content = content.replace(/consciousnessLogs/g, 'systemLogs');
    content = content.replace(/AI Consciousness Stream/g, 'System Event Stream');
    content = content.replace(/AI Consciousness/g, 'System Events');
    
    // Remove emojis
    const emojis = ['🚀', '✅', '🗳️', '🤖', '🔔', '🎉', '🟢', '🔴', '🌐', '📡', '🏆', '🔄', '❌', '✨', '🧠'];
    emojis.forEach(emoji => {
        content = content.split(emoji).join('').replace(/ \[/g, '[').replace(/  /g, ' ');
    });

    fs.writeFileSync(filePath, content, 'utf8');
}

cleanFile('app.js');
cleanFile('index.html');
console.log("Cleanup complete!");
