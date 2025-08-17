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
- [x] 2.5.1 It's time to get some AI voices integrated from Eleven Labs. I have an eleven labs account with voices. I want to see them as options in the voice picker, but also keep the existing browser based voices. Plz make a clean distinguishment between the two kinds of voice (browser vs. eleven labs). 
- [x] 2.5.2 Bug: The voices play at the same time, plz fix
- [x] 2.5.3 Bug: the mute button doesn't work on 11 labs voices at least (not sure about browser based ones)
- [x] 2.5.4 THings get a bit crazy with entering time values. Plz add a save button to the form and do less updating settings on change. Also, plz time in seconds not milliseconds. There are humans watching....
- [x] 2.5.5 Bug: When in manual mode, we don't get eleven labs voices working (maybe browser too? not sure).
- [x] 2.5.6 Feature: Plz update the names of the bots in chat according to the voice we select
- [x] 2.5.7 The comment now button is tucked away in the drawer but needs to be somewhere handy that I can click without opening the drawer. 
- [x] 2.7 So we don't need mini mode vs. not mini mode, it just needs to be responsive one-column vs. two column. So I noticed that past 1200px width of the screen, the screencapture starts to get cut off. I think we can assume wide screen aspect angle, typical of gaming... I want to be able to increase the window width and be able to have a two column layout.. But when making the screen more narrow, I want the layout to be one column. I also want to be able to control via grab handle the screenshare height. Never cut off the screenshare. It's ok if there is negative space to the left and right, but not top and bottom when in one-column mode.
- [x] 2.8 Let's give this app a new visual vibe. I'm THINKIN UNICORN RAINBOW THEME. Make it sparkle. ✨


- [ ] 3.0 Let's remove the browser based voices for now. CLean it all up from the UI and any code. We're just supporting eleven labs voices now. 
- [ ] 3.1 Let's allow the user to override the prompt for a specific bot, by voice. So when switching the second esteemed viewer to voice X from Y, if X has a prompt associated with it, that prompt gets used, but esteemed viewer 1's prompt does not change. Going to have to support viewer 1 and 2 having separate prompts. I want to be able to update that prompt in the UI. Provide a default for the voices, and track in memory between sessions what overrides the user has made. 
- [ ] 4. Let's have the human user be able to send a chat message to the bots.
- [ ] 5. LETS DO A THEME PICKER! Let's start with Unicorn Rainbow theme, but I want at least 7 more themes.
