document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const playerCountInput = document.getElementById('player-count');
    const playerNamesContainer = document.getElementById('player-names-container');
    const maxShotsInput = document.getElementById('max-shots');
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

    // Modal Elements
    const modal = document.getElementById('modal');
    const modalText = document.getElementById('modal-text');
    const modalOptions = document.getElementById('modal-options');
    const closeBtn = document.querySelector('.modal .close-btn');


    // --- Game State Variables ---
    let players = []; // Array of { name: string, shotsTaken: number, isOut: boolean, id: number, hasImmunity: boolean }
    let currentPlayerIndex = 0;
    let tiles = []; // Array of { id: number, action: string, revealed: boolean }
    let maxShots = 0;
    let totalTiles = 0;
    let revealedTilesCount = 0;
    let gameActive = false;
    let playOrderReversed = false;
    let currentRule = null; // For 'Make a Rule' tile
    let activeTurnCallback = null; // Store the callback for modal resolution


    // --- Tile Action Pool ---
    const baseActions = [
        // Common
        'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot', 'Take 1 Shot',
        'Take 2 Shots', 'Take 2 Shots', 'Take 2 Shots',
        'Person to your Left takes 1 shot', 'Person to your Left takes 1 shot',
        'Person to your Right takes 1 shot', 'Person to your Right takes 1 shot',
        'Choose someone to take 1 shot', 'Choose someone to take 1 shot',
        'Safe!', 'Safe!', 'Safe!',
        'Social! (Everyone drinks 1)', 'Social! (Everyone drinks 1)',
        // Less Common
        'Take 3 Shots',
        'Choose someone to take 2 shots',
        'Waterfall (3 seconds)',
        'Categories (Loser takes 1 shot)',
        'Make a Rule (Lasts until next rule)',
        // Rare / Game Changers
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
        "Arm wrestle the person to your left (best of 1, no shot for the loser)."
    ];


    // --- Event Listeners ---
    // playerCountInput.addEventListener('input', updatePlayerNameFields); // Removed as input is readonly
    stepperUpBtn.addEventListener('click', handleStepper);
    stepperDownBtn.addEventListener('click', handleStepper);
    startGameBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', () => location.reload());

    // Modal Listeners
    if (closeBtn) {
        closeBtn.onclick = function() {
            hideModal();
            if (activeTurnCallback) {
                console.log("Modal closed manually, advancing turn.");
                // actionDisplay.textContent += " (Choice skipped)"; // Optional message
                activeTurnCallback();
                activeTurnCallback = null;
            }
        }
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            hideModal();
            if (activeTurnCallback) {
                console.log("Modal closed via background click, advancing turn.");
                // actionDisplay.textContent += " (Choice skipped)"; // Optional message
                activeTurnCallback();
                activeTurnCallback = null;
            }
        }
    }


    // --- Initialization ---
    updatePlayerNameFields(); // Generate initial fields
    updateStepperButtonsState(); // Set initial button disabled state


    // --- Stepper Functions ---
    function handleStepper(event) {
        const isUp = event.target.classList.contains('stepper-up');
        let currentValue = parseInt(playerCountInput.value);
        const min = parseInt(playerCountInput.min);
        const max = parseInt(playerCountInput.max);

        if (isUp && currentValue < max) {
            currentValue++;
        } else if (!isUp && currentValue > min) {
            currentValue--;
        }

        playerCountInput.value = currentValue;
        updatePlayerNameFields(); // Update the name input fields
        updateStepperButtonsState(); // Update button disabled state
    }

    function updateStepperButtonsState() {
        const currentValue = parseInt(playerCountInput.value);
        const min = parseInt(playerCountInput.min);
        const max = parseInt(playerCountInput.max);

        stepperDownBtn.disabled = (currentValue <= min);
        stepperUpBtn.disabled = (currentValue >= max);
    }


    // --- Setup Functions ---
    function updatePlayerNameFields() {
        // Ensure count is read correctly and clamped within bounds
        const count = Math.max(
            parseInt(playerCountInput.min) || 2,
            Math.min(
                parseInt(playerCountInput.max) || 8,
                parseInt(playerCountInput.value) || 2
            )
        );
        // Ensure the input reflects the potentially clamped value
        if (parseInt(playerCountInput.value) !== count) {
            playerCountInput.value = count;
        }


        playerNamesContainer.innerHTML = ''; // Clear existing fields

        for (let i = 0; i < count; i++) {
            const label = document.createElement('label');
            label.classList.add('player-label');
            label.htmlFor = `player-name-${i}`;
            label.textContent = `Player ${i + 1}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Enter Name`; // Placeholder is good for mobile
            input.id = `player-name-${i}`;
            input.required = true;

            playerNamesContainer.appendChild(label);
            playerNamesContainer.appendChild(input);
        }
    }

    function startGame() {
        const playerCount = parseInt(playerCountInput.value);
        // Validation check (redundant with stepper but safe)
        if (playerCount < (parseInt(playerCountInput.min) || 2) || playerCount > (parseInt(playerCountInput.max) || 8)) {
            alert(`Please select between ${playerCountInput.min} and ${playerCountInput.max} players.`);
            return;
        }

        maxShots = parseInt(maxShotsInput.value) || 0; // 0 means unlimited

        players = [];
        let validNames = true;
        for (let i = 0; i < playerCount; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            const name = nameInput.value.trim();
            if (!name) {
                validNames = false;
                break;
            }
            players.push({
                name: name,
                shotsTaken: 0,
                isOut: false,
                id: i,
                hasImmunity: false
            });
        }

        if (!validNames) {
            alert('Please enter a name for every player.');
            return;
        }

        totalTiles = 12 + (playerCount - 2) * 6;
        tiles = generateTiles(totalTiles);

        currentPlayerIndex = 0;
        revealedTilesCount = 0;
        playOrderReversed = false;
        currentRule = null;
        gameActive = true;

        setupScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        gameScreen.classList.add('active');

        renderGameBoard();
        updatePlayerInfo();
        updateTurnIndicator();
        actionDisplay.textContent = 'Select a tile to start!';
    }

    function generateTiles(numTiles) {
        let actions = [];
        while (actions.length < numTiles) {
            actions = actions.concat(baseActions);
        }
        actions = shuffleArray(actions.slice(0, numTiles));
        return actions.map((action, index) => ({
            id: index,
            action: action,
            revealed: false
        }));
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Game Rendering Functions ---
    function renderGameBoard() {
        tileGrid.innerHTML = '';
        tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            if (tile.revealed) {
                tileElement.classList.add('revealed');
                tileElement.innerHTML = `<span>${tile.action}</span>`;
            } else {
                tileElement.dataset.tileId = tile.id;
                tileElement.innerHTML = `<span>${tile.id + 1}</span>`;
                tileElement.addEventListener('click', handleTileClick);
            }
            tileGrid.appendChild(tileElement);
        });
    }

     function updatePlayerInfo() {
        playerInfoContainer.innerHTML = '';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-info');
            if (player.id === currentPlayerIndex && !player.isOut) {
                playerDiv.classList.add('current-player');
            }
            if (player.isOut) {
                playerDiv.classList.add('player-out');
            }

            let statusText = '';
            if(player.isOut) {
                 statusText = '<span class="player-info-status out">(OUT)</span>';
            } else if (player.hasImmunity) {
                 statusText = '<span class="player-info-status immune">(Immune)</span>';
            }

            playerDiv.innerHTML = `
                <span class="player-info-name">${player.name}</span>
                <span class="player-info-shots">Shots: ${player.shotsTaken}</span>
                ${statusText}
            `;
            playerInfoContainer.appendChild(playerDiv);
        });
    }

    function updateTurnIndicator() {
        let activePlayerFound = players.some(p => !p.isOut);
        if (!activePlayerFound && gameActive) {
            if (!checkGameOver()) { endGame(); }
            return;
        }

        let attempts = 0;
        while (players.length > 0 && players[currentPlayerIndex].isOut && attempts <= players.length * 2) { // Added players.length > 0 check
             advancePlayerIndex();
            attempts++;
            if (attempts > players.length * 2) {
                console.error("Infinite loop potential in updateTurnIndicator.");
                if (gameActive) endGame();
                return;
            }
        }
        // Check again if we found an active player after skipping
        if (players.length === 0 || players[currentPlayerIndex].isOut) {
             if (!checkGameOver() && gameActive) { // Avoid calling endgame if already over
                  console.log("No active players left after skipping.");
                  endGame();
             }
             return;
        }

        turnIndicator.innerHTML = `Current Turn: <span>${players[currentPlayerIndex].name}</span>`;
        updatePlayerInfo(); // Update highlighting
    }


    // --- Gameplay Functions ---
     function handleTileClick(event) {
        if (!gameActive) return;

        const tileElement = event.target.closest('.tile');
        if (!tileElement || tileElement.classList.contains('revealed') || tileElement.classList.contains('reveal-animation')) {
            return;
        }

        const tileId = parseInt(tileElement.dataset.tileId);
        const tile = tiles[tileId];

        tileElement.classList.add('reveal-animation');
        tileElement.removeEventListener('click', handleTileClick); // Prevent clicking during animation

        setTimeout(() => {
            tile.revealed = true;
            revealedTilesCount++;
            tileElement.classList.add('revealed');
            tileElement.innerHTML = `<span>${tile.action}</span>`;
            actionDisplay.textContent = `${players[currentPlayerIndex].name} revealed: ${tile.action}`;
             if (currentRule) {
                 actionDisplay.textContent += ` | Rule: ${currentRule}`;
             }

            const postActionCallback = () => {
                 // Check max shots *after* the action (and any modal choice) is resolved
                 const maxShotsReached = checkMaxShots();
                 // Re-update info in case someone got out
                 if(maxShotsReached) updatePlayerInfo();

                 if (checkGameOver()) {
                     endGame();
                 } else {
                     // Advance turn after a short delay, unless action handled it (like Skip)
                     // Currently, Skip handles its own double advance.
                     setTimeout(nextTurn, 750);
                 }
            };

            processAction(tile.action, currentPlayerIndex, postActionCallback);

        }, 300); // Half flip duration (0.6s / 2)
    }


    function processAction(action, playerIndex, turnCallback) {
        console.log(`Processing action: "${action}" for player ${players[playerIndex].name}`);
        const currentPlayer = players[playerIndex];
        let turnShouldAdvanceImmediately = true; // Assume normal advance unless action uses modal/prompt
        let shotsToGive = 0;
        let targetPlayerIndex = -1;

        const getNextActivePlayerIndex = (startIndex, direction) => {
             let nextIndex = startIndex;
             let attempts = 0;
             const numPlayers = players.length;
             if (numPlayers <= 1) return -1; // No one else if only 1 player total

             do {
                  const step = direction === 'left' ? -1 : 1;
                  nextIndex = (nextIndex + step + numPlayers) % numPlayers;
                  attempts++;
                  // Ensure we don't get stuck if only one player is left active
                  if (nextIndex === startIndex && attempts > numPlayers) break;
             } while (players[nextIndex].isOut && attempts < numPlayers * 2); // Safety break increased

             // If after checks, the found index is out, or we looped too much, return -1
             return (players[nextIndex].isOut || attempts >= numPlayers * 2) ? -1 : nextIndex;
        };


        switch (action) {
            // --- Self-inflicted ---
            case 'Take 1 Shot': giveShots(playerIndex, 1, '', turnCallback); turnShouldAdvanceImmediately = false; break;
            case 'Take 2 Shots': giveShots(playerIndex, 2, '', turnCallback); turnShouldAdvanceImmediately = false; break;
            case 'Take 3 Shots': giveShots(playerIndex, 3, '', turnCallback); turnShouldAdvanceImmediately = false; break;

            // --- Positional ---
            case 'Person to your Left takes 1 shot':
                 targetPlayerIndex = getNextActivePlayerIndex(playerIndex, playOrderReversed ? 'right' : 'left');
                 if (targetPlayerIndex !== -1) {
                     giveShots(targetPlayerIndex, 1, ` (from ${currentPlayer.name})`, turnCallback);
                     turnShouldAdvanceImmediately = false;
                 } else {
                      actionDisplay.textContent += ` (No one active to the left!)`;
                 }
                 break;
            case 'Person to your Right takes 1 shot':
                 targetPlayerIndex = getNextActivePlayerIndex(playerIndex, playOrderReversed ? 'left' : 'right');
                 if (targetPlayerIndex !== -1) {
                     giveShots(targetPlayerIndex, 1, ` (from ${currentPlayer.name})`, turnCallback);
                     turnShouldAdvanceImmediately = false;
                 } else {
                     actionDisplay.textContent += ` (No one active to the right!)`;
                 }
                 break;

            // --- Targeted ---
            case 'Choose someone to take 1 shot':
            case 'Choose someone to take 2 shots':
                 shotsToGive = action.includes('2') ? 2 : 1;
                 turnShouldAdvanceImmediately = false; // Prompt handles callback
                 promptPlayerChoice(
                      playerIndex,
                      (chosenPlayerId) => { // Success
                           giveShots(chosenPlayerId, shotsToGive, ` (chosen by ${currentPlayer.name})`, turnCallback); // giveShots calls final turnCallback
                      },
                      () => { // Failure/Cancel
                           actionDisplay.textContent += ' (Choice skipped/invalid)';
                           turnCallback(); // Advance turn if choice failed
                      },
                      `Choose player to take ${shotsToGive} shot(s):`
                 );
                 break;

            // --- Group Actions ---
            case 'Social! (Everyone drinks 1)':
                 // Reverted to mandatory shots for simplicity (handling modals for all is complex)
                 actionDisplay.textContent = 'Social! Everyone takes 1 shot!';
                 players.forEach((p, index) => {
                      if (!p.isOut) {
                          // Directly apply shot, bypass choice for Social
                          // Check immunity here before applying
                          if(p.hasImmunity) {
                              actionDisplay.textContent += ` ${p.name} used immunity (Social).`;
                              p.hasImmunity = false; // Consume immunity
                          } else {
                              applyShot(index, 1, ' (Social!)');
                          }
                      }
                 });
                 updatePlayerInfo(); // Update everyone's info
                 // turnShouldAdvanceImmediately remains true
                 break;

            // --- Safe / No Effect ---
            case 'Safe!':
                 actionDisplay.textContent = `${currentPlayer.name} is Safe! Nothing happens.`;
                 break;

            // --- Game State Changers ---
            case 'Reverse Play Order':
                 playOrderReversed = !playOrderReversed;
                 actionDisplay.textContent += ` (Play order is now ${playOrderReversed ? 'REVERSED' : 'NORMAL'})`;
                 break;
             case 'Skip Your Next Turn':
                 actionDisplay.textContent += ` (${currentPlayer.name} skips next turn)`;
                 turnShouldAdvanceImmediately = false; // Manual advancement
                 turnCallback(); // Triggers first nextTurn via the main flow timeout
                 setTimeout(nextTurn, 50); // Call nextTurn again shortly after for the skip
                 break;
             case 'Immunity for next shot assigned to you':
                  if (!currentPlayer.isOut) {
                      currentPlayer.hasImmunity = true;
                      actionDisplay.textContent += ` (${currentPlayer.name} gained Immunity!)`;
                      updatePlayerInfo();
                  } else {
                      actionDisplay.textContent += ` (${currentPlayer.name} is out, immunity ignored)`;
                  }
                 break;

            // --- Mini-Games / Rule Tiles ---
            case 'Waterfall (3 seconds)':
                actionDisplay.textContent += ' - Everyone starts drinking! Current player stops after 3s.';
                break;
            case 'Categories (Loser takes 1 shot)':
                actionDisplay.textContent += ' - Start a round of Categories! (Loser takes 1 shot or does activity)';
                break;
            case 'Make a Rule (Lasts until next rule)':
                 turnShouldAdvanceImmediately = false; // Prompt is async
                 setTimeout(() => {
                     const newRulePrompt = prompt(`Make a rule! (e.g., 'No first names'). Penalty: 1 Shot/Activity.\nCurrent Rule: ${currentRule || 'None'}`);
                     if (newRulePrompt && newRulePrompt.trim() !== '') {
                         currentRule = newRulePrompt.trim();
                         actionDisplay.textContent = `New Rule by ${currentPlayer.name}: ${currentRule}`;
                         console.log("Current Rule:", currentRule);
                     } else {
                         actionDisplay.textContent += ' (Rule skipped or unchanged)';
                     }
                     turnCallback(); // Ensure callback fires after prompt interaction
                 }, 50); // Delay before prompt
                 break;

            default:
                console.warn(`Action "${action}" needs specific implementation.`);
                actionDisplay.textContent += ' (Action effect TBD)';
                break;
        }

        if (turnShouldAdvanceImmediately) {
            turnCallback();
        }
    }

    // Helper to apply shot effects (updates state, logging)
    function applyShot(playerIndex, numShots, reason = '') {
         const targetPlayer = players[playerIndex];
         if (!targetPlayer || targetPlayer.isOut) return;

         targetPlayer.shotsTaken += numShots;
         console.log(`${targetPlayer.name} takes ${numShots} shot(s)${reason}. Total: ${targetPlayer.shotsTaken}`);
    }

    // Offers choice between shot and activity via modal
    function giveShots(playerIndex, numShots, reason = '', turnCallback) {
        if (playerIndex < 0 || playerIndex >= players.length) {
            console.error("Invalid playerIndex in giveShots:", playerIndex);
            if (turnCallback) turnCallback(); // Ensure flow continues
            return;
        }

        const targetPlayer = players[playerIndex];

        if (targetPlayer.isOut) {
            console.log(`${targetPlayer.name} is out, shots ignored.`);
            actionDisplay.textContent += ` (${targetPlayer.name} is out, shots ignored${reason})`;
            if (turnCallback) turnCallback(); // Player out, advance turn
            return;
        }

        // No choice needed if 0 shots or no alternatives defined
        if (numShots <= 0 || alternativeActivities.length === 0) {
             // Still check immunity if shots were intended but maybe 0 due to logic error
             if (numShots > 0 && targetPlayer.hasImmunity) {
                  actionDisplay.textContent = `${targetPlayer.name} used Immunity! Shots blocked${reason}.`;
                  targetPlayer.hasImmunity = false;
             } else if (numShots > 0) {
                 applyShot(playerIndex, numShots, reason); // Apply if positive shots and no immunity
                 actionDisplay.textContent += ` - ${targetPlayer.name} takes ${numShots} shot(s)${reason}.`;
             }
             updatePlayerInfo();
             if (turnCallback) turnCallback(); // Proceed turn
             return;
        }

        // --- Offer Choice Via Modal ---
        activeTurnCallback = turnCallback; // Store callback for modal buttons

        modalText.textContent = `${targetPlayer.name}, you are assigned ${numShots} shot(s)${reason}. Choose an option:`;
        modalOptions.innerHTML = ''; // Clear previous

        // Option 1: Take Shot(s)
        const takeShotBtn = document.createElement('button');
        takeShotBtn.textContent = `Take ${numShots} Shot(s)`;
        takeShotBtn.onclick = () => {
            hideModal();
            // Check immunity *when choosing* to take the shot
            if (targetPlayer.hasImmunity) {
                 actionDisplay.textContent = `${targetPlayer.name} used Immunity! Shots blocked${reason}.`;
                 targetPlayer.hasImmunity = false; // Consume immunity
            } else {
                applyShot(playerIndex, numShots, reason);
                actionDisplay.textContent += ` - ${targetPlayer.name} took ${numShots} shot(s)${reason}.`;
            }
            updatePlayerInfo();
            if (activeTurnCallback) activeTurnCallback(); // Resolve turn
            activeTurnCallback = null;
        };
        modalOptions.appendChild(takeShotBtn);

        // Option 2: Do Activity
        const doActivityBtn = document.createElement('button');
        doActivityBtn.textContent = 'Do an Activity Instead';
        doActivityBtn.style.backgroundColor = 'var(--accent-secondary)'; // Different color
        doActivityBtn.onclick = () => {
            hideModal();
            const activityIndex = Math.floor(Math.random() * alternativeActivities.length);
            const chosenActivity = alternativeActivities[activityIndex];

            actionDisplay.textContent = `${targetPlayer.name} opted out and must: ${chosenActivity}`;
             if (currentRule) { actionDisplay.textContent += ` | Rule: ${currentRule}`; } // Keep showing rule

            console.log(`${targetPlayer.name} chose activity: ${chosenActivity}`);
            // No shot change, no immunity use
            updatePlayerInfo(); // Update UI (mainly for potential status changes elsewhere)
            if (activeTurnCallback) activeTurnCallback(); // Resolve turn
            activeTurnCallback = null;
        };
        modalOptions.appendChild(doActivityBtn);

        showModal();
    }

    // Prompts current player to choose another player via modal
    function promptPlayerChoice(chooserIndex, successCallback, failureCallback, promptText) {
        const availablePlayers = players.filter((p, index) => index !== chooserIndex && !p.isOut);

        if (availablePlayers.length === 0) {
            actionDisplay.textContent += ` (No other active players to choose!)`;
            if (failureCallback) failureCallback();
            return;
        }

        activeTurnCallback = failureCallback; // Store failure callback for modal close/cancel

        modalText.textContent = `${players[chooserIndex].name}, ${promptText}`;
        modalOptions.innerHTML = '';

        availablePlayers.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.name;
            btn.onclick = () => {
                hideModal();
                activeTurnCallback = null; // Clear failure callback, choice made
                if (successCallback) successCallback(p.id); // Pass chosen player ID
            };
            modalOptions.appendChild(btn);
        });

        // Add a Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel / Skip Choice';
        cancelBtn.style.backgroundColor = 'var(--accent-warn)';
        cancelBtn.onclick = () => {
             hideModal();
             const cb = activeTurnCallback; // Capture before clearing
             activeTurnCallback = null;
             if (cb) cb(); // Execute original failure callback
        }
        modalOptions.appendChild(cancelBtn);

        showModal();
    }

    // Checks if any player reached max shots and marks them out
    function checkMaxShots() {
        if (maxShots <= 0) return false; // Unlimited shots

        let someoneGotOut = false;
        players.forEach(player => {
            if (!player.isOut && player.shotsTaken >= maxShots) {
                player.isOut = true;
                someoneGotOut = true;
                // Append message - ensure it doesn't get too long/repetitive
                const outMsg = ` *** ${player.name} reached ${maxShots} shots and is OUT! ***`;
                 if (!actionDisplay.textContent.includes(outMsg)) { // Avoid duplicate messages
                      actionDisplay.textContent += outMsg;
                 }
                console.log(`${player.name} is OUT!`);
            }
        });
        // Don't updatePlayerInfo here, let the main callback handle it after potential state changes
        return someoneGotOut;
    }

    // Advances player index respecting direction and wrapping
    function advancePlayerIndex() {
         if (players.length === 0) return; // Safety check
         const step = playOrderReversed ? -1 : 1;
         currentPlayerIndex = (currentPlayerIndex + step + players.length) % players.length;
    }

    // Moves game to the next turn
    function nextTurn() {
         if (!gameActive) return;

         advancePlayerIndex(); // Move to the next potential player index
         updateTurnIndicator(); // Skips out players and updates display

         // Optional: Clear part of the action display or set a new prompt
         // actionDisplay.textContent = `Your turn, ${players[currentPlayerIndex].name}!`;
         if (currentRule) { // Remind of rule if active
             if (!actionDisplay.textContent.includes(`Rule: ${currentRule}`)) {
                  actionDisplay.textContent += ` | Rule: ${currentRule}`;
             }
         }
     }

    // Checks conditions for game end
    function checkGameOver() {
        if (!gameActive) return true; // Already over

        // Condition 1: All tiles revealed
        if (revealedTilesCount >= totalTiles) {
            console.log("Game Over: All tiles revealed.");
            return true;
        }

        // Condition 2: 1 or 0 players left active (if started with > 1)
        const activePlayersCount = players.filter(p => !p.isOut).length;
        if (players.length > 1 && activePlayersCount <= 1) {
             console.log(`Game Over: ${activePlayersCount} active players remaining.`);
             return true;
        }

        return false; // Game continues
    }

    // --- End Game Functions ---
    function endGame() {
        if (!gameActive) return; // Prevent multiple calls
        gameActive = false;
        console.log("Game Over!");
        hideModal(); // Ensure modal is closed

        const activePlayers = players.filter(p => !p.isOut);
        let resultTitle = '';
        let finalScoresHTML = '<h3>Final Scores:</h3>';

        // Determine winner/result based on who is left
        if (players.length > 1 && activePlayers.length === 1) {
            resultTitle = `<h2><span>${activePlayers[0].name}</span> is the winner!</h2><p>(Last one standing)</p>`;
        } else if (activePlayers.length === 0 && players.length > 0) {
            resultTitle = `<h2>Everyone is out!</h2><p>No winner this time.</p>`;
        } else { // Game ended by tiles running out, or multiple players still active
            let potentialWinners = activePlayers.length > 0 ? activePlayers : players; // Consider all if everyone is out
            potentialWinners.sort((a, b) => a.shotsTaken - b.shotsTaken); // Sort by fewest shots

             if (potentialWinners.length > 0) {
                  const minShots = potentialWinners[0].shotsTaken;
                  const winners = potentialWinners.filter(p => p.shotsTaken === minShots);

                  if (winners.length === 1) {
                      resultTitle = `<h2><span>${winners[0].name}</span> wins!</h2><p>(Fewest shots: ${minShots})</p>`;
                  } else if (winners.length > 1) {
                      resultTitle = `<h2>It's a tie!</h2><p>Between <span>${winners.map(p => p.name).join('</span> and <span>')}</span> (${minShots} shots each)</p>`;
                  } else { // Should not happen if potentialWinners had items
                       resultTitle = `<h2>Game Finished!</h2>`;
                  }
             } else { // No players at all?
                   resultTitle = `<h2>Game Finished!</h2>`;
             }
        }

        // Generate HTML for final scores list
        players.sort((a, b) => a.shotsTaken - b.shotsTaken); // Sort results by shots
        players.forEach(p => {
            finalScoresHTML += `<p>${p.name}: ${p.shotsTaken} shots ${p.isOut ? '<span class="player-info-status out">(OUT)</span>' : ''}</p>`;
        });

        resultsDiv.innerHTML = resultTitle + finalScoresHTML;

        // Switch screens
        gameScreen.classList.remove('active');
        gameOverScreen.classList.add('active');
    }

    // --- Modal Helper Functions ---
    function showModal() {
         if (modal) modal.style.display = 'block';
    }

    function hideModal() {
         if (modal) modal.style.display = 'none';
         if (modalOptions) modalOptions.innerHTML = ''; // Clear options
         if (modalText) modalText.textContent = '';
         // Don't clear activeTurnCallback here, handled by button clicks / close logic
    }

}); // End of DOMContentLoaded
