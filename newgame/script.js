document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed"); // DEBUG

    // --- DOM Element References ---
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const playerCountInput = document.getElementById('player-count');
    const playerNamesContainer = document.getElementById('player-names-container');
    const maxShotsInput = document.getElementById('max-shots');
    const initialAltsInput = document.getElementById('initial-alts'); // NEW: Ref for Alts input
    const startGameBtn = document.getElementById('start-game-btn');
    const turnIndicator = document.getElementById('turn-indicator');
    const playerInfoContainer = document.getElementById('player-info-container');
    const tileGrid = document.getElementById('tile-grid');
    const actionDisplay = document.getElementById('action-display');
    const resultsDiv = document.getElementById('results');
    const playAgainBtn = document.getElementById('play-again-btn');

    // Stepper Buttons
    const stepperUpBtn = document.querySelector('.stepper-up');
    const stepperDownBtn = document.querySelector('.stepper-down');

    // How to Play Elements
    const howToPlayBtn = document.getElementById('how-to-play-btn');
    const rulesModal = document.getElementById('rules-modal');
    const rulesModalCloseBtn = rulesModal.querySelector('.rules-modal-close');

    // Choice Modal Elements
    const choiceModal = document.getElementById('modal'); // Keep original ID reference
    const modalText = document.getElementById('modal-text');
    const modalOptions = document.getElementById('modal-options');
    const choiceModalCloseBtn = choiceModal.querySelector('.choice-modal-close');

    // Basic check for essential elements
    if (!setupScreen || !gameScreen || !gameOverScreen || !playerCountInput || !playerNamesContainer || !startGameBtn || !choiceModal || !rulesModal || !maxShotsInput || !initialAltsInput) { // Added check for new inputs
        console.error("CRITICAL ERROR: One or more essential DOM elements not found!");
        alert("Error initializing the game. Please check the HTML structure.");
        return; // Stop script execution
    }
    console.log("Essential DOM elements found."); // DEBUG

    // --- Game State Variables ---
    let players = []; // Array of { name: string, shotsTaken: number, altsRemaining: number, isOut: boolean, id: number, hasImmunity: boolean } // Added altsRemaining
    let currentPlayerIndex = 0;
    let tiles = [];
    let maxShots = 0;
    let initialAlts = 3; // Default value, will be overwritten by input
    let totalTiles = 0;
    let revealedTilesCount = 0;
    let gameActive = false;
    let playOrderReversed = false;
    let currentRule = null;
    let activeTurnCallback = null;


    // --- Tile Action Pool ---
    const baseActions = [
        'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot',
        'Take 2 Shots', 'Take 2 Shots', 'Take 2 Shots',
        'Person to your Left takes 1 shot', 'Person to your Left takes 1 shot',
        'Person to your Right takes 1 shot', 'Person to your Right takes 1 shot',
        'Choose someone to take 1 shot', 'Choose someone to take 1 shot',
        'Safe!', 'Safe!', 'Safe!',
        'Social! (Everyone drinks 1)', 'Social! (Everyone drinks 1)',
        'Take 3 Shots',
        'Choose someone to take 2 shots',
        'Waterfall (3 seconds)',
        'Categories (Loser takes 1 shot)',
        'Make a Rule (Lasts until next rule)',
        'Reverse Play Order',
        'Skip Your Next Turn',
        'Immunity for next shot assigned to you',
    ];

    // --- Alternative Activities ---
    const alternativeActivities = [
        "Sing the chorus of a song chosen by the group (off-key encouraged).",
        "Perform 10 push-ups with someone sitting on your back (if safe and consensual).",
        "Attempt a 15-second breakdance routine (no skill required).",
        "Hold a plank for 30 seconds while reciting the alphabet backward.",
        "Do 20 jumping jacks in slow motion.",
        "Imitate a celebrity chosen by the group for 30 seconds.",
        "Run a lap around the room while narrating it like a sports commentator.",
        "Balance a spoon on your nose for 10 seconds.",
        "Do an exaggerated catwalk strut across the room.",
        "Tell a terrible dad joke and wait for someone to laugh (they take a shot if they do).",
        "Attempt to juggle 3 random objects for 15 seconds.",
        "Speak in an accent chosen by the group for the next 2 minutes.",
        "Do a 20-second interpretive dance to no music.",
        "Recite a tongue twister 3 times fast (e.g., “She sells seashells by the seashore”).",
        "Hold an ice cube in your hand until it melts (or 30 seconds, whichever comes first).",
        "Arm wrestle the person to your left (best of 1, no shot for the loser).",
        "Do a 15-second impression of your favorite animal.",
        "Text a random contact “I’m being chased by a goose!” and wait for their reply.",
        "Spin around 10 times and then try to walk in a straight line.",
        "Do 15 squats while singing “Happy Birthday” (even if it’s no one’s birthday).",
        "Hold a staring contest with the person across from you—first to blink loses.",
        "Shout “I am the champion!” in your most dramatic voice, then flex for 10 seconds.",
        "Hop on one foot while naming 5 fruits or vegetables.",
        "Pretend to be a robot for the next minute (voice and movements).",
        "Do a 20-second air guitar solo to an imaginary rock song.",
        "Tell the group your most embarrassing childhood story in 30 seconds.",
        "Wear a blindfold (or close your eyes) and guess 3 objects by touch alone.",
        "Do a 15-second “slow-motion fight scene” with an imaginary opponent.",
        "Say “chugga chugga choo choo” 5 times fast while mimicking a train."
    ];


    // --- Event Listeners ---
    console.log("Attaching event listeners..."); // DEBUG
    if (stepperUpBtn) stepperUpBtn.addEventListener('click', handleStepper); else console.error("Stepper Up Button not found");
    if (stepperDownBtn) stepperDownBtn.addEventListener('click', handleStepper); else console.error("Stepper Down Button not found");
    if (startGameBtn) startGameBtn.addEventListener('click', startGame); else console.error("Start Game Button not found");
    if (playAgainBtn) playAgainBtn.addEventListener('click', () => location.reload()); else console.warn("Play Again Button not found");
    if (howToPlayBtn) howToPlayBtn.addEventListener('click', showRulesModal); else console.error("How to Play Button not found");
    if (choiceModalCloseBtn) { choiceModalCloseBtn.onclick = () => { hideChoiceModal(); if (activeTurnCallback) { console.log("Choice Modal closed manually"); activeTurnCallback(); activeTurnCallback = null; } } } else { console.error("Choice Modal Close Button not found"); }
    if (rulesModalCloseBtn) { rulesModalCloseBtn.onclick = hideRulesModal; } else { console.error("Rules Modal Close Button not found"); }
    window.onclick = function(event) {
        if (event.target == choiceModal) { hideChoiceModal(); if (activeTurnCallback) { console.log("Choice Modal closed via background"); activeTurnCallback(); activeTurnCallback = null; } }
        else if (event.target == rulesModal) { hideRulesModal(); }
    }
    console.log("Event listeners attached."); // DEBUG


    // --- Initialization ---
    console.log("Running initial setup..."); // DEBUG
    updatePlayerNameFields();
    updateStepperButtonsState();
    console.log("Initial setup complete."); // DEBUG


    // --- Stepper Functions ---
    function handleStepper(event) {
        // ... (Keep existing handleStepper function - no changes needed here) ...
        console.log("Stepper button clicked"); // DEBUG
        const isUp = event.target.classList.contains('stepper-up');
        let currentValue = parseInt(playerCountInput.value);
        const min = parseInt(playerCountInput.min);
        const max = parseInt(playerCountInput.max);
        if (isUp && currentValue < max) { currentValue++; }
        else if (!isUp && currentValue > min) { currentValue--; }
        playerCountInput.value = currentValue;
        console.log("Player count changed to:", currentValue); // DEBUG
        updatePlayerNameFields(); updateStepperButtonsState();
    }
    function updateStepperButtonsState() {
        // ... (Keep existing updateStepperButtonsState function - no changes needed here) ...
        const currentValue = parseInt(playerCountInput.value);
        const min = parseInt(playerCountInput.min);
        const max = parseInt(playerCountInput.max);
        if (stepperDownBtn) stepperDownBtn.disabled = (currentValue <= min);
        if (stepperUpBtn) stepperUpBtn.disabled = (currentValue >= max);
    }


    // --- Setup Functions ---
    function updatePlayerNameFields() {
        // ... (Keep existing updatePlayerNameFields function - make sure wrapperDiv logic is present) ...
        console.log("Updating player name fields..."); // DEBUG
        if (!playerNamesContainer) { console.error("playerNamesContainer is null!"); return; }
        const count = Math.max( parseInt(playerCountInput.min)||2, Math.min( parseInt(playerCountInput.max)||8, parseInt(playerCountInput.value)||2 ) );
        if (parseInt(playerCountInput.value) !== count) { playerCountInput.value = count; }
        console.log("Generating fields for", count, "players."); // DEBUG
        playerNamesContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const label = document.createElement('label'); label.classList.add('player-label'); label.htmlFor = `player-name-${i}`; label.textContent = `Player ${i + 1}:`;
            const input = document.createElement('input'); input.type = 'text'; input.placeholder = `Enter Name`; input.id = `player-name-${i}`; input.required = true;
            const wrapperDiv = document.createElement('div'); wrapperDiv.style.display = 'flex'; wrapperDiv.style.alignItems = 'center'; wrapperDiv.style.gap = '10px'; wrapperDiv.style.marginBottom = '0';
            wrapperDiv.appendChild(label); wrapperDiv.appendChild(input);
            playerNamesContainer.appendChild(wrapperDiv);
        }
        console.log("Player name fields updated."); // DEBUG
    }

    function startGame() {
        console.log("Attempting to start game..."); // DEBUG
        const playerCount = parseInt(playerCountInput.value);
        if (playerCount < (parseInt(playerCountInput.min) || 2) || playerCount > (parseInt(playerCountInput.max) || 8)) {
            alert(`Please select between ${playerCountInput.min} and ${playerCountInput.max} players.`); console.warn("Start cancelled: Invalid player count."); return;
        }

        maxShots = parseInt(maxShotsInput.value) || 0;
        initialAlts = parseInt(initialAltsInput.value); // Read initial alts value
        // Add validation for initialAlts if desired (e.g., >= 0)
        if (isNaN(initialAlts) || initialAlts < 0) {
            console.warn("Invalid Initial Alts value, defaulting to 3"); // DEBUG
            initialAlts = 3; // Default if invalid input
            initialAltsInput.value = 3; // Correct the input display
        }
        console.log("Max shots:", maxShots, "| Initial Alts:", initialAlts); // DEBUG

        players = []; // Reset players array
        let validNames = true;
        for (let i = 0; i < playerCount; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            if (!nameInput) { console.error(`CRITICAL: Cannot find name input: player-name-${i}`); validNames = false; alert(`Error: Missing input for Player ${i + 1}.`); break; }
            const name = nameInput.value.trim();
            if (!name) { console.warn(`Player ${i + 1} name empty.`); validNames = false; nameInput.style.borderColor = 'var(--accent-warn)'; }
            else {
                nameInput.style.borderColor = '';
                players.push({
                    name: name,
                    shotsTaken: 0,
                    altsRemaining: initialAlts, // Assign initial alts count
                    isOut: false,
                    id: i,
                    hasImmunity: false
                });
                console.log(`Added Player ${i}: ${name}, Alts: ${initialAlts}`); // DEBUG
            }
        }

        if (!validNames) { alert('Please enter a name for every player.'); console.warn("Start cancelled: Invalid names."); return; }
        console.log("Players array populated:", players); // DEBUG

        totalTiles = 12 + (playerCount - 2) * 6;
        tiles = generateTiles(totalTiles);
        console.log("Generated", totalTiles, "tiles."); // DEBUG

        currentPlayerIndex = 0; revealedTilesCount = 0; playOrderReversed = false; currentRule = null; gameActive = true;
        console.log("Game state reset. Game active:", gameActive); // DEBUG

        if (setupScreen) setupScreen.classList.remove('active'); if (gameOverScreen) gameOverScreen.classList.remove('active'); if (gameScreen) gameScreen.classList.add('active');
        console.log("Switched to Game Screen."); // DEBUG

        renderGameBoard(); updatePlayerInfo(); updateTurnIndicator(); // Initial render calls
        if (actionDisplay) actionDisplay.textContent = 'Select a tile to start!';
        console.log("Initial game board rendered."); // DEBUG
    }

    function generateTiles(numTiles) {
        // ... (Keep existing generateTiles function - no changes needed here) ...
        let actions = []; while (actions.length < numTiles) { actions = actions.concat(baseActions); }
        actions = shuffleArray(actions.slice(0, numTiles)); return actions.map((a, i) => ({ id: i, action: a, revealed: false }));
    }
    function shuffleArray(array) {
        // ... (Keep existing shuffleArray function - no changes needed here) ...
        for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
    }

    // --- Game Rendering Functions ---
    function renderGameBoard() {
        // ... (Keep existing renderGameBoard function - no changes needed here) ...
        console.log("Rendering game board..."); if (!tileGrid) { console.error("tileGrid missing"); return; }
        tileGrid.innerHTML = ''; tiles.forEach(tile => { const el = document.createElement('div'); el.classList.add('tile'); if (tile.revealed) { el.classList.add('revealed'); el.innerHTML = `<span>${tile.action}</span>`; } else { el.dataset.tileId = tile.id; el.innerHTML = `<span>${tile.id + 1}</span>`; el.addEventListener('click', handleTileClick); } tileGrid.appendChild(el); });
        console.log("Game board rendered.");
    }

     function updatePlayerInfo() {
        // console.log("Updating player info display..."); // DEBUG (Noisy)
        if (!playerInfoContainer) { console.error("playerInfoContainer missing"); return; }
        if (!players || players.length === 0) { console.warn("UpdatePlayerInfo: No players data."); playerInfoContainer.innerHTML = ''; return; }
        console.log("UpdatePlayerInfo: Updating for players:", players); // DEBUG

        playerInfoContainer.innerHTML = ''; // Clear previous info

        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-info');
            if (player.id === currentPlayerIndex && !player.isOut) { playerDiv.classList.add('current-player'); }
            if (player.isOut) { playerDiv.classList.add('player-out'); }

            let statusText = '';
            if(player.isOut) { statusText = '<span class="player-info-status out">(OUT)</span>'; }
            else if (player.hasImmunity) { statusText = '<span class="player-info-status immune">(Immune)</span>'; }

            // Added player.altsRemaining display
            playerDiv.innerHTML = `
                <span class="player-info-name">${player.name || 'Unnamed'}</span>
                <span class="player-info-shots">Shots: ${player.shotsTaken}</span>
                <span class="player-info-alts">Alts Left: ${player.altsRemaining}</span> <!-- Display Alts -->
                ${statusText}
            `;
            playerInfoContainer.appendChild(playerDiv);
        });
         // console.log("Player info display updated."); // DEBUG
    }

    function updateTurnIndicator() {
        // ... (Keep existing updateTurnIndicator function - ensure updatePlayerInfo() call is present at the end) ...
        if (!turnIndicator) { console.error("turnIndicator missing"); return; } if (!gameActive || !players || players.length === 0) { turnIndicator.innerHTML = 'Waiting...'; return; }
        let activeExist = players.some(p => !p.isOut); if (!activeExist) { if (!checkGameOver()) { console.log("UpdateTurnIndicator: No active, ending."); endGame(); } return; }
        let attempts = 0; while (players[currentPlayerIndex % players.length].isOut && attempts <= players.length) { advancePlayerIndex(); attempts++; if (attempts > players.length) { console.error("Loop in updateTurnIndicator skip"); if (!checkGameOver()) endGame(); return; } }
        if (players[currentPlayerIndex % players.length].isOut) { if (!checkGameOver()) { console.log("UpdateTurnIndicator: All out after skip"); endGame(); } return; }
        const currentName = players[currentPlayerIndex].name || 'Unnamed'; turnIndicator.innerHTML = `Current Turn: <span>${currentName}</span>`;
        updatePlayerInfo(); // Ensure UI update happens after finding correct player
    }


    // --- Gameplay Functions ---
     function handleTileClick(event) {
        // ... (Keep existing handleTileClick function - no changes needed here) ...
         if (!gameActive) return; const tileEl = event.target.closest('.tile'); if (!tileEl || tileEl.classList.contains('revealed') || tileEl.classList.contains('reveal-animation')) return;
         const tileId = parseInt(tileEl.dataset.tileId); const tile = tiles.find(t => t.id === tileId); if (!tile || tile.revealed) return; console.log(`Tile ${tileId + 1} clicked`);
         tileEl.classList.add('reveal-animation'); tileEl.removeEventListener('click', handleTileClick);
         setTimeout(() => { tile.revealed = true; revealedTilesCount++; tileEl.classList.add('revealed'); tileEl.innerHTML = `<span>${tile.action}</span>`; console.log(`Tile ${tileId+1} action: ${tile.action}`);
             let actionTxt = `${players[currentPlayerIndex].name} revealed: ${tile.action}`; if (currentRule) actionTxt += ` | Rule: ${currentRule}`; if(actionDisplay) actionDisplay.textContent = actionTxt;
             const postActionCb = () => { console.log("PostActionCb for tile:", tileId); const maxReached = checkMaxShots(); if(maxReached) updatePlayerInfo(); if (checkGameOver()) { console.log("Game over in PostActionCb"); endGame(); } else { console.log("Scheduling next turn"); setTimeout(nextTurn, 750); } };
             processAction(tile.action, currentPlayerIndex, postActionCb);
         }, 300);
    }

    function processAction(action, playerIndex, turnCallback) {
        // ... (Keep existing processAction function - no changes needed here) ...
        console.log(`Processing action: "${action}"`); const current = players[playerIndex]; let advance = true; let shots = 0; let targetIdx = -1;
        const getNextIdx = (start, dir) => { let next = start; let attempts = 0; const numP = players.length; if (numP <= 1) return -1; do { const step = dir === 'left' ? -1 : 1; next = (next + step + numP) % numP; attempts++; if (next === start && attempts > numP) break; } while (players[next].isOut && attempts < numP * 2); return (players[next].isOut || attempts >= numP * 2) ? -1 : next; };
        switch (action) {
            case 'Take 1 Shot': giveShots(playerIndex, 1, '', turnCallback); advance = false; break; case 'Take 2 Shots': giveShots(playerIndex, 2, '', turnCallback); advance = false; break; case 'Take 3 Shots': giveShots(playerIndex, 3, '', turnCallback); advance = false; break;
            case 'Person to your Left takes 1 shot': targetIdx = getNextIdx(playerIndex, playOrderReversed?'right':'left'); if(targetIdx!==-1){ giveShots(targetIdx, 1, `(from ${current.name})`, turnCallback); advance=false;} else {if(actionDisplay) actionDisplay.textContent += ' (No one left!)';} break;
            case 'Person to your Right takes 1 shot': targetIdx = getNextIdx(playerIndex, playOrderReversed?'left':'right'); if(targetIdx!==-1){ giveShots(targetIdx, 1, `(from ${current.name})`, turnCallback); advance=false;} else {if(actionDisplay) actionDisplay.textContent += ' (No one right!)';} break;
            case 'Choose someone to take 1 shot': case 'Choose someone to take 2 shots': shots = action.includes('2')?2:1; advance=false; promptPlayerChoice(playerIndex, (chosenId)=>{giveShots(chosenId, shots, `(chosen by ${current.name})`, turnCallback);}, ()=>{if(actionDisplay) actionDisplay.textContent+=' (Choice skip)'; turnCallback();}, `Choose for ${shots} shot(s):`); break;
            case 'Social! (Everyone drinks 1)': if(actionDisplay) actionDisplay.textContent = 'Social! 1 shot!'; let socialMsg=''; players.forEach((p, i)=>{if(!p.isOut){ if(p.hasImmunity){ socialMsg+=` ${p.name} immune.`; p.hasImmunity=false; } else { applyShot(i, 1, '(Social!)'); socialMsg+=` ${p.name} drank.`;}}}); console.log("Social:", socialMsg); updatePlayerInfo(); break;
            case 'Safe!': if(actionDisplay) actionDisplay.textContent = `${current.name} Safe!`; break;
            case 'Reverse Play Order': playOrderReversed=!playOrderReversed; if(actionDisplay) actionDisplay.textContent += ` (Order ${playOrderReversed?'REVERSED':'NORMAL'})`; break;
            case 'Skip Your Next Turn': if(actionDisplay) actionDisplay.textContent += ` (${current.name} skips)`; advance=false; turnCallback(); setTimeout(nextTurn, 50); break;
            case 'Immunity for next shot assigned to you': if (!current.isOut) { current.hasImmunity=true; if(actionDisplay) actionDisplay.textContent+=` (${current.name} immune!)`; updatePlayerInfo();} else {if(actionDisplay) actionDisplay.textContent+=` (${current.name} out)`;} break;
            case 'Waterfall (3 seconds)': if(actionDisplay) actionDisplay.textContent += ' - Waterfall!'; break; case 'Categories (Loser takes 1 shot)': if(actionDisplay) actionDisplay.textContent += ' - Categories!'; break;
            case 'Make a Rule (Lasts until next rule)': advance=false; setTimeout(()=>{ const rule = prompt(`Rule? Penalty: 1 Shot/Activity.\nCurrent: ${currentRule||'None'}`); if(rule&&rule.trim()!==''){ currentRule=rule.trim(); if(actionDisplay) actionDisplay.textContent=`${current.name}: Make Rule. New: ${currentRule}`; console.log("Rule:", currentRule); } else { if(actionDisplay) actionDisplay.textContent+=' (Rule skip)';} turnCallback(); }, 50); break;
            default: console.warn(`Unhandled: "${action}"`); if(actionDisplay) actionDisplay.textContent+=' (TBD)'; break;
        }
        if(advance){ turnCallback(); }
    }

    function applyShot(playerIndex, numShots, reason = '') {
        // ... (Keep existing applyShot function - no changes needed here) ...
        if (playerIndex<0 || playerIndex>=players.length) return; const target=players[playerIndex]; if(!target || target.isOut) return; target.shotsTaken+=numShots; console.log(`${target.name} takes ${numShots} shot(s)${reason}. Total: ${target.shotsTaken}`);
    }

    // Modified giveShots to check and decrement altsRemaining
    function giveShots(playerIndex, numShots, reason = '', turnCallback) {
        if (playerIndex < 0 || playerIndex >= players.length) { if (turnCallback) turnCallback(); return; }
        const targetPlayer = players[playerIndex];

        if (targetPlayer.isOut) {
            if(actionDisplay) actionDisplay.textContent += ` (${targetPlayer.name} is out)`;
            if (turnCallback) turnCallback(); return;
        }

        // Check if choice should be offered (shots>0, alts exist, activities exist)
        const canChooseAlt = numShots > 0 && targetPlayer.altsRemaining > 0 && alternativeActivities.length > 0;

        // If no choice is possible (0 shots, 0 alts left, or no activities defined), apply shot directly (checking immunity)
        if (!canChooseAlt && numShots > 0) {
             let message = '';
             if (targetPlayer.hasImmunity) {
                  message = ` ${targetPlayer.name} used Immunity! Shots blocked${reason}.`; // Prepend space
                  targetPlayer.hasImmunity = false; // Consume immunity
             } else {
                 applyShot(playerIndex, numShots, reason); // Apply if positive shots and no immunity
                 message = ` - ${targetPlayer.name} must take ${numShots} shot(s)${reason}.`; // Adjusted message
             }
             if (message && actionDisplay) actionDisplay.textContent += message;
             updatePlayerInfo(); // Update UI after potential immunity change
             if (turnCallback) turnCallback(); // Proceed turn via callback
             return;
        } else if (numShots <= 0) { // Handle case of 0 shots explicitly
             // No action needed, just advance turn
             if (turnCallback) turnCallback();
             return;
        }


        // --- Offer Choice Via Choice Modal ---
        activeTurnCallback = turnCallback; // Store callback for modal buttons

        if(modalText) modalText.textContent = `${targetPlayer.name}, you are assigned ${numShots} shot(s)${reason}. Choose an option:`;
        if(modalOptions) modalOptions.innerHTML = '';

        // Option 1: Take Shot(s) Button (Always available if shots > 0)
        const takeShotBtn = document.createElement('button');
        takeShotBtn.textContent = `Take ${numShots} Shot(s)`;
        takeShotBtn.onclick = () => {
            hideChoiceModal();
            let message = '';
            if (targetPlayer.hasImmunity) {
                 message = ` ${targetPlayer.name} used Immunity! Shots blocked${reason}.`; // Prepend space
                 targetPlayer.hasImmunity = false; // Consume immunity
            } else {
                applyShot(playerIndex, numShots, reason); // Apply the shot state change
                message = ` - ${targetPlayer.name} took ${numShots} shot(s)${reason}.`;
            }
             if (message && actionDisplay) actionDisplay.textContent += message; // Append result
            updatePlayerInfo(); // Update UI

            if (activeTurnCallback) activeTurnCallback(); // Resolve turn
            activeTurnCallback = null;
        };
        if(modalOptions) modalOptions.appendChild(takeShotBtn);

        // Option 2: Do Activity Button (Only if canChooseAlt is true)
        if (canChooseAlt) {
            const doActivityBtn = document.createElement('button');
            doActivityBtn.textContent = `Do Activity (${targetPlayer.altsRemaining} left)`; // Show count on button
            doActivityBtn.style.backgroundColor = 'var(--accent-secondary)';
            doActivityBtn.onclick = () => {
                hideChoiceModal();
                targetPlayer.altsRemaining--; // Decrement alts count ****
                const activityIndex = Math.floor(Math.random() * alternativeActivities.length);
                const chosenActivity = alternativeActivities[activityIndex];
                if(actionDisplay) {
                    actionDisplay.textContent = `${targetPlayer.name} opted out (${targetPlayer.altsRemaining} alts left) and must: ${chosenActivity}`; // Update display with new count
                    if (currentRule) actionDisplay.textContent += ` | Rule: ${currentRule}`;
                }
                console.log(`${targetPlayer.name} chose activity, ${targetPlayer.altsRemaining} alts left.`); // DEBUG
                updatePlayerInfo(); // Update UI to show decremented count ****

                if (activeTurnCallback) activeTurnCallback(); // Resolve turn
                activeTurnCallback = null;
            };
            if(modalOptions) modalOptions.appendChild(doActivityBtn);
        } else if (numShots > 0) {
            // If shots > 0 but cannot choose alt, maybe add text saying why
             if(modalText) modalText.textContent += ` (No alternatives remaining!)`;
        }


        showChoiceModal(); // Show the modal
    }


    function promptPlayerChoice(chooserIdx, successCb, failureCb, promptTxt) {
        // ... (Keep existing promptPlayerChoice function - no changes needed here) ...
        const available=players.filter((p,i)=> i!==chooserIdx && !p.isOut); if(available.length===0){ if(actionDisplay) actionDisplay.textContent+=' (No one else!)'; if(failureCb) failureCb(); return; }
        activeTurnCallback=failureCb; if(modalText) modalText.textContent=`${players[chooserIdx].name}, ${promptTxt}`; if(modalOptions) modalOptions.innerHTML='';
        available.forEach(p=>{ const btn=document.createElement('button'); btn.textContent=p.name; btn.onclick=()=>{ hideChoiceModal(); activeTurnCallback=null; if(successCb) successCb(p.id); }; if(modalOptions) modalOptions.appendChild(btn); });
        const btnCancel=document.createElement('button'); btnCancel.textContent='Cancel'; btnCancel.style.backgroundColor='var(--accent-warn)'; btnCancel.onclick=()=>{ hideChoiceModal(); const cb=activeTurnCallback; activeTurnCallback=null; if(cb) cb(); }; if(modalOptions) modalOptions.appendChild(btnCancel);
        showChoiceModal();
    }

    function checkMaxShots() {
        // ... (Keep existing checkMaxShots function - no changes needed here) ...
        if(maxShots<=0) return false; let out=false; players.forEach(p=>{ if(!p.isOut && p.shotsTaken>=maxShots){ p.isOut=true; out=true; const msg=` *** ${p.name} OUT! ***`; if(actionDisplay && !actionDisplay.textContent.includes(msg)) actionDisplay.textContent+=msg; console.log(`${p.name} OUT!`);}}); return out;
    }

    function advancePlayerIndex() {
        // ... (Keep existing advancePlayerIndex function - no changes needed here) ...
        if(!players || players.length===0) return; const step=playOrderReversed?-1:1; currentPlayerIndex=(currentPlayerIndex+step+players.length)%players.length;
    }

    function nextTurn() {
        // ... (Keep existing nextTurn function - no changes needed here) ...
        if (!gameActive) return; console.log("Advancing turn..."); advancePlayerIndex(); updateTurnIndicator();
    }

    function checkGameOver() {
        // ... (Keep existing checkGameOver function - no changes needed here) ...
        if(!gameActive) return true; if(revealedTilesCount>=totalTiles){ console.log("Game Over: Tiles ended."); return true; } const activeCount=players.filter(p=>!p.isOut).length; if(players.length>1 && activeCount<=1){ console.log(`Game Over: ${activeCount} active.`); return true; } return false;
    }

    // Modified endGame to include altsRemaining in results
    function endGame() {
        if (!gameActive && !gameOverScreen.classList.contains('active')) { return; }
        console.log("Ending Game!"); gameActive = false; hideChoiceModal(); hideRulesModal();
        const active = players.filter(p => !p.isOut); let title = ''; let scores = '<h3>Final Scores:</h3>';
        if (players.length > 1 && active.length === 1) { title = `<h2><span>${active[0].name}</span> WINS!</h2>`; }
        else if (players.length > 0 && active.length === 0) { title = `<h2>Everyone is out!</h2>`; }
        else { let potential = active.length > 0 ? active : players; potential.sort((a, b) => a.shotsTaken - b.shotsTaken);
             if (potential.length > 0) { const min = potential[0].shotsTaken; const winners = potential.filter(p => p.shotsTaken === min);
                  if (winners.length === 1) { title = `<h2><span>${winners[0].name}</span> wins! (${min} shots)</h2>`; }
                  else if (winners.length > 1) { title = `<h2>Tie! <span>${winners.map(p => p.name).join(' & ')}</span> (${min} shots)</h2>`; }
                  else { title = `<h2>Game Finished!</h2>`; }
             } else { title = `<h2>Game Finished!</h2>`; } }
        players.sort((a, b) => a.shotsTaken - b.shotsTaken);
        // Add alts remaining to the results display
        players.forEach(p => {
            scores += `<p>${p.name||'?'}: ${p.shotsTaken} shots ${p.isOut ? '<span class="player-info-status out">(OUT)</span>' : ''} <span class="alts-left-results">(${p.altsRemaining} alts left)</span></p>`;
        });
        if(resultsDiv) resultsDiv.innerHTML = title + scores;
        if(gameScreen) gameScreen.classList.remove('active'); if(setupScreen) setupScreen.classList.remove('active'); if(gameOverScreen) gameOverScreen.classList.add('active');
        console.log("Game over screen up.");
    }

    // --- Modal Helper Functions ---
    // ... (Keep existing modal functions - no changes needed here) ...
    function showChoiceModal() { if (choiceModal) choiceModal.style.display = 'block'; }
    function hideChoiceModal() { if (choiceModal) choiceModal.style.display = 'none'; if (modalOptions) modalOptions.innerHTML = ''; if (modalText) modalText.textContent = ''; }
    function showRulesModal() { if(rulesModal) rulesModal.style.display = 'block'; const rc = document.getElementById('rules-content'); if (rc) rc.scrollTop = 0; }
    function hideRulesModal() { if(rulesModal) rulesModal.style.display = 'none'; }

}); // End of DOMContentLoaded
