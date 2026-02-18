# mcpwall demo — VHS tape
# Records a GIF + MP4 of mcpwall blocking dangerous MCP tool calls

Output demo/demo.gif
Output demo/demo.mp4

Set Shell "bash"
Set FontSize 15
Set Width 1000
Set Height 580
Set Padding 20
Set Theme { "name": "mcpwall", "black": "#09090b", "red": "#ef4444", "green": "#22c55e", "yellow": "#eab308", "blue": "#3b82f6", "magenta": "#a855f7", "cyan": "#06b6d4", "white": "#e4e4e7", "brightBlack": "#52525b", "brightRed": "#f87171", "brightGreen": "#4ade80", "brightYellow": "#facc15", "brightBlue": "#60a5fa", "brightMagenta": "#c084fc", "brightCyan": "#22d3ee", "brightWhite": "#fafafa", "background": "#09090b", "foreground": "#e4e4e7", "selection": "#27272a", "cursor": "#06b6d4" }
Set TypingSpeed 40ms
Set CursorBlink false

Sleep 500ms

Type "./demo/run-demo.sh"
Enter
Sleep 14s

Sleep 2s
