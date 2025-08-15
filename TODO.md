## TODO

- [x] 1. Add history to the chat completions. So all previous things said, are included in the context, up to 100, but configurable via the UI how many past messages to include.
- [x] 1.5 Different voices for the robots
- [x] 1.6 A new mode where the robots comment not on interval, but on button push.
- [x] 2. option in ui to turn off or put screenshare
- [x] 2.1 mini mode above the chat. Actually, mini mode the whole UI turns into a one-column layout so we can just.
- [x] 2.2 When in mini mode, the UI at the top takes a lot of screen real estate. Maybe collapse it, into a drawer? Your call. Be creative.
- [x] 2.3 At some point there is enough messages I have to scroll down to see them. The Esteemed Viewers chat div should always be independently scrolled to the bottom when a message comes in.
- [x] 2.4 Refactor all buttons/settings into a drawer.
- [x] 2.5 Add a start.sh script to start the app and install.sh for getting deps and make it interactive to ask for api key and model
- [ ] 2.7 So we don't need mini mode vs. not mini mode, it just needs to be responsive one-column vs. two column. So I noticed that past 1200px width of the screen, the screencapture starts to get cut off. I think we can assume wide screen aspect angle, typical of gaming... I want to be able to increase the window width and be able to have a two column layout.. But when making the screen more narrow, I want the layout to be one column. I also want to be able to control via grab handle the screenshare height. Never cut off the screenshare. It's ok if there is negative space to the left and right, but not top and bottom when in one-column mode.



- [ ] 3. Implement TTS from outside provider like OpenAI Whisper API.
- [ ] 4. Let's have the human user be able to send a chat message to the bots.
