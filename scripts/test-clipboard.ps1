# Teste rápido do clipboard (Node)
$fp = "C:\Users\paulo\Documents\BeatStack Library\Downloads\ordnance-samples-aura-demo\OS - 'Aura' Atmosphere 01 F#min.wav"
node -e "const m=require('./desktop/clipboard-win'); console.log(m.copyFileToClipboardWin(process.argv[1]))" $fp
