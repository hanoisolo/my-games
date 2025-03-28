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

    // Modal Elements (Optional - Get if implementing modal fully)
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
    let playOrderReversed = false; // For Reverse Play Order action


    // --- Tile Action Pool ---
    // Define a weighted list of possible actions
    const baseActions = [
        // Common (Increase frequency for more common actions)
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
        'Waterfall (3 seconds)', // Tile describes action, players execute IRL
        'Categories (Loser takes 1 shot)', // Tile describes action
        'Make a Rule (Lasts until next rule)', // Needs state to track rule

        // Rare / Game Changers
        'Reverse Play Order',
        'Skip Your Next Turn',
        'Immunity for next shot assigned to you', // Player gains immunity state
        // 'Finish your drink', // Potentially add back if desired, use sparingly
        // 'Thumbmaster', // Needs state tracking
        // 'Question Master', // Needs state tracking
    ];

    // --- Event Listeners ---
    playerCountInput.addEventListener('input', updatePlayerNameFields);
    startGameBtn.addEventListener('click', startGame);
    playAgainBtn.addEventListener('click', () => location.reload()); // Simple reset: reload the page

    // Modal Listeners (if using modal)
    if (closeBtn) {
        closeBtn.onclick = function() { hideModal(); }
    }
    window.onclick = function(event) {
        if (event.target == modal) { hideModal(); }
    }


    // --- Initialization ---
    updatePlayerNameFields(); // Initial call for default player count

    // --- Setup Functions ---
    function updatePlayerNameFields() {
        const count = Math.max(2, Math.min(8, parseInt(playerCountInput.value) || 2)); // Ensure count is between 2 and 8
        playerCountInput.value = count; // Update input value if corrected
        playerNamesContainer.innerHTML = ''; // Clear existing fields

        for (let i = 0; i < count; i++) {
            const label = document.createElement('label');
            label.classList.add('player-label');
            label.htmlFor = `player-name-${i}`;
            label.textContent = `Player ${i + 1}:`;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Enter Name`;
            input.id = `player-name-${i}`;
            input.required = true;

            // Append label and input
            playerNamesContainer.appendChild(label);
            playerNamesContainer.appendChild(input);
        }
    }

    function startGame() {
        const playerCount = parseInt(playerCountInput.value);
        if (playerCount < 2 || playerCount > 8) {
            alert('Please enter a player count between 2 and 8.');
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

        // Calculate tile count: 12 base + 6 for each player above 2
        totalTiles = 12 + (playerCount - 2) * 6;

        // Prepare and shuffle tiles
        tiles = generateTiles(totalTiles);

        // Reset game state
        currentPlayerIndex = 0;
        revealedTilesCount = 0;
        playOrderReversed = false;
        gameActive = true;

        // Switch screens
        setupScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        gameScreen.classList.add('active');

        // Render initial game state
        renderGameBoard();
        updatePlayerInfo();
        updateTurnIndicator();
        actionDisplay.textContent = 'Select a tile to start!'; // Initial message
    }

    function generateTiles(numTiles) {
        let actions = [];
        // Ensure we have enough actions, repeat the base pool if needed
        while (actions.length < numTiles) {
            // Add weighted actions - simple repetition works for weighting
            actions = actions.concat(baseActions);
        }
        // Take exactly numTiles actions and shuffle them
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
            [array[i], array[j]] = [array[j], array[i]]; // ES6 swap
        }
        return array;
    }

    // --- Game Rendering Functions ---
    function renderGameBoard() {
        tileGrid.innerHTML = ''; // Clear previous grid
        tiles.forEach(tile => {
            const tileElement = document.createElement('div');
            tileElement.classList.add('tile');
            tileElement.dataset.tileId = tile.id;
            // Wrap number in span for styling/JS targeting
            tileElement.innerHTML = `<span>${tile.id + 1}</span>`;
            tileElement.addEventListener('click', handleTileClick);
            tileGrid.appendChild(tileElement);
        });
    }

    function updatePlayerInfo() {
        playerInfoContainer.innerHTML = ''; // Clear previous info
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-info');
            if (player.id === currentPlayerIndex && !player.isOut) { // Only highlight if not out
                playerDiv.classList.add('current-player');
            }
            if (player.isOut) {
                playerDiv.classList.add('player-out');
            }

            // Structure the inner HTML for better styling control
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
        // Ensure currentPlayerIndex points to an active player
        let activePlayerFound = players.some(p => !p.isOut);
        if (!activePlayerFound && gameActive) {
            console.log("No active players left, should be game over.");
            if (!checkGameOver()) { // Avoid redundant calls if already checking
                 endGame();
            }
            return; // Stop if no active players
        }

        let attempts = 0;
        // Skip over players who are out
        while (players[currentPlayerIndex].isOut && attempts <= players.length) {
             advancePlayerIndex(); // Use helper function for direction
            attempts++;
            if (attempts > players.length * 2) { // Increased safety break limit
                console.error("Infinite loop potential in updateTurnIndicator - check player 'isOut' status and game over logic.");
                if (gameActive) endGame(); // Force end if stuck
                return;
            }
        }

        // Update indicator text, wrapping name in span
        turnIndicator.innerHTML = `Current Turn: <span>${players[currentPlayerIndex].name}</span>`;
        updatePlayerInfo(); // Re-render player info to update highlighting/status
    }


    // --- Gameplay Functions ---
     function handleTileClick(event) {
        if (!gameActive) return;

        const tileElement = event.target.closest('.tile'); // Handle click on span inside tile
        if (!tileElement) return;

        const tileId = parseInt(tileElement.dataset.tileId);
        const tile = tiles[tileId];

        // Prevent clicking revealed or currently animating tiles
        if (tile.revealed || tileElement.classList.contains('reveal-animation')) {
            return;
        }

        // 1. Add animation class
        tileElement.classList.add('reveal-animation');

        // 2. Use setTimeout to apply changes *after* animation starts (half duration)
        setTimeout(() => {
            tile.revealed = true;
            revealedTilesCount++;
            tileElement.classList.add('revealed');
            // Wrap revealed text in span for CSS flip-back styling
            tileElement.innerHTML = `<span>${tile.action}</span>`;
            actionDisplay.textContent = `${players[currentPlayerIndex].name} revealed: ${tile.action}`;

            // 3. Process the action
            // Pass a callback function to handle turn advancement *after* action is fully resolved
            processAction(tile.action, currentPlayerIndex, () => {
                 // 4. Check max shots *after* action is processed
                checkMaxShots();

                // 5. Check for game over
                if (checkGameOver()) {
                    endGame();
                } else {
                    // 6. Advance turn (if action didn't explicitly handle it)
                    // Actions like Skip or Reverse might modify flow differently
                     setTimeout(nextTurn, 750); // Delay allows reading the action result
                }
            });

        }, 300); // Matches half of the 0.6s CSS transition for the flip
    }


    function processAction(action, playerIndex, turnCallback) {
        console.log(`Processing action: "${action}" for player ${players[playerIndex].name}`);
        const currentPlayer = players[playerIndex];
        let turnShouldAdvance = true; // Assume turn advances unless action specifies otherwise

        // Helper to find next active player index respecting direction
        const getNextActivePlayerIndex = (startIndex, direction) => {
             let nextIndex = startIndex;
             let attempts = 0;
             do {
                  const step = direction === 'left' ? -1 : 1;
                  nextIndex = (nextIndex + step + players.length) % players.length;
                  attempts++;
             } while (players[nextIndex].isOut && attempts < players.length);
             return players[nextIndex].isOut ? -1 : nextIndex; // Return -1 if no other active player
        };


        // Handle IMMUNITY check globally for actions involving receiving shots
        // We will check specific target's immunity within giveShots function

        // Use switch for clarity
        switch (action) {
            // --- Self-inflicted ---
            case 'Take 1 Shot':
                giveShots(playerIndex, 1);
                break;
            case 'Take 2 Shots':
                giveShots(playerIndex, 2);
                break;
            case 'Take 3 Shots':
                giveShots(playerIndex, 3);
                break;

            // --- Positional ---
            case 'Person to your Left takes 1 shot': {
                 const targetIndex = getNextActivePlayerIndex(playerIndex, playOrderReversed ? 'right' : 'left'); // Respect reversal
                 if (targetIndex !== -1) {
                      giveShots(targetIndex, 1, ` (from ${currentPlayer.name})`);
                 } else {
                      actionDisplay.textContent += ` (No one active to the left!)`;
                 }
                 break;
            }
            case 'Person to your Right takes 1 shot': {
                 const targetIndex = getNextActivePlayerIndex(playerIndex, playOrderReversed ? 'left' : 'right'); // Respect reversal
                 if (targetIndex !== -1) {
                     giveShots(targetIndex, 1, ` (from ${currentPlayer.name})`);
                 } else {
                     actionDisplay.textContent += ` (No one active to the right!)`;
                 }
                 break;
            }

            // --- Targeted ---
            case 'Choose someone to take 1 shot':
            case 'Choose someone to take 2 shots': {
                 const numShots = action.includes('2') ? 2 : 1;
                 turnShouldAdvance = false; // Turn advancement handled by prompt callback
                 promptPlayerChoice(
                      playerIndex,
                      (targetIndex) => { // Success callback
                           giveShots(targetIndex, numShots, ` (chosen by ${currentPlayer.name})`);
                           turnCallback(); // Advance turn only after choice is made & processed
                      },
                      () => { // Failure/Cancel callback
                           actionDisplay.textContent += ' (Choice skipped/invalid)';
                           turnCallback(); // Advance turn even if choice fails
                      },
                      `Choose player to take ${numShots} shot(s):`
                 );
                 break;
            }

            // --- Group Actions ---
            case 'Social! (Everyone drinks 1)':
                 players.forEach((p, index) => {
                     if (!p.isOut) giveShots(index, 1, ' (Social!)');
                 });
                 // Override display with a single message
                 actionDisplay.textContent = 'Social! Everyone takes 1 shot!';
                 break;

            // --- Safe / No Effect ---
            case 'Safe!':
                 actionDisplay.textContent = `${currentPlayer.name} is Safe! Nothing happens.`;
                 break;

            // --- Game State Changers ---
            case 'Reverse Play Order':
                 playOrderReversed = !playOrderReversed;
                 actionDisplay.textContent += ` (Play order is now ${playOrderReversed ? 'REVERSED' : 'NORMAL'})`;
                 // Turn still advances, but nextTurn logic will use the flag
                 break;
             case 'Skip Your Next Turn':
                 actionDisplay.textContent += ` (${currentPlayer.name} skips next turn)`;
                 turnShouldAdvance = false; // We handle advancement manually
                  // Need to call nextTurn *twice* effectively. Call the callback which calls nextTurn once,
                  // then call nextTurn again immediately *after* the callback finishes.
                  turnCallback(); // This triggers the first nextTurn via the main flow
                  // Need to ensure this second call happens reliably after the first
                  setTimeout(nextTurn, 50); // Call nextTurn again shortly after
                 break;
             case 'Immunity for next shot assigned to you':
                  if (!currentPlayer.isOut) {
                      currentPlayer.hasImmunity = true;
                      actionDisplay.textContent += ` (${currentPlayer.name} gained Immunity!)`;
                      updatePlayerInfo(); // Show immunity status immediately
                  } else {
                      actionDisplay.textContent += ` (${currentPlayer.name} is out, immunity ignored)`;
                  }
                 break;

            // --- Mini-Games / Rule Tiles (Placeholders) ---
            case 'Waterfall (3 seconds)':
                actionDisplay.textContent += ' - Everyone starts drinking! Current player stops after 3s.';
                // Players execute this IRL. Maybe add a visual timer?
                break;
            case 'Categories (Loser takes 1 shot)':
                actionDisplay.textContent += ' - Start a round of Categories!';
                // Players play IRL. The game doesn't enforce the shot.
                break;
            case 'Make a Rule (Lasts until next rule)':
                 // Could use prompt or modal to get rule input
                 const newRule = prompt(`Make a rule! (e.g., 'No first names', 'Drink with left hand'). Penalty: 1 Shot.`);
                 if (newRule) {
                     // Need to store 'activeRule' in game state and display it
                     actionDisplay.textContent = `New Rule by ${currentPlayer.name}: ${newRule}`;
                     console.log("Current Rule:", newRule); // Add state variable later
                 } else {
                     actionDisplay.textContent += ' (Rule skipped)';
                 }
                break;

            // --- Default for Unhandled Actions ---
            default:
                console.warn(`Action "${action}" needs specific implementation.`);
                actionDisplay.textContent += ' (Action effect TBD)';
                break;
        }

        // If the action doesn't handle turn advancement itself, call the callback
        if (turnShouldAdvance) {
            turnCallback();
        }
    }

    function giveShots(playerIndex, numShots, reason = '') {
        // Ensure playerIndex is valid
        if (playerIndex < 0 || playerIndex >= players.length) {
            console.error("Invalid playerIndex in giveShots:", playerIndex);
            return;
        }

        const targetPlayer = players[playerIndex];

        if (targetPlayer.isOut) {
            // Optionally display that shots were ignored
             console.log(`${targetPlayer.name} is out, shots ignored.`);
            // Don't update main action display here, might overwrite context
            return;
        }

        // Check immunity *before* assigning shots
        if (targetPlayer.hasImmunity) {
             actionDisplay.textContent = `${targetPlayer.name} used Immunity! Shots blocked${reason}.`;
             targetPlayer.hasImmunity = false; // Use immunity
             updatePlayerInfo(); // Update display immediately
             return; // Stop processing shots
        }

        targetPlayer.shotsTaken += numShots;
        console.log(`${targetPlayer.name} takes ${numShots} shot(s). Total: ${targetPlayer.shotsTaken}`);

        // Append shot info to action display or set specific message
        // Be careful not to overwrite crucial info from complex actions
        // For simple cases, this is fine:
        if (actionDisplay.textContent.includes('revealed:')) { // Append if it's the initial reveal message
             actionDisplay.textContent += ` - ${targetPlayer.name} takes ${numShots} shot(s)${reason}.`;
        } // Else, assume actionDisplay was set meaningfully by processAction

        updatePlayerInfo(); // Update UI to show new shot count
    }

    function promptPlayerChoice(chooserIndex, successCallback, failureCallback, promptText) {
        const availablePlayers = players.filter((p, index) => index !== chooserIndex && !p.isOut);

        if (availablePlayers.length === 0) {
            actionDisplay.textContent = `No other active players available to choose!`;
            if (failureCallback) failureCallback(); // Indicate failure
            return;
        }

        // --- Option 1: Use Basic Prompt (Functional) ---
        const choicesText = availablePlayers.map((p, i) => `${i + 1}: ${p.name}`).join('\n');
        // Use setTimeout to avoid blocking the UI thread immediately after tile reveal
        setTimeout(() => {
            const choiceNumStr = prompt(`${promptText}\n${choicesText}`);
            // Check if prompt was cancelled (null) or empty
            if (choiceNumStr === null || choiceNumStr.trim() === "") {
                 console.log("Choice cancelled or empty.");
                 if (failureCallback) failureCallback();
                 return;
            }
            const choiceNum = parseInt(choiceNumStr, 10);

            if (!isNaN(choiceNum) && choiceNum > 0 && choiceNum <= availablePlayers.length) {
                const targetPlayer = availablePlayers[choiceNum - 1];
                if (successCallback) successCallback(targetPlayer.id); // Pass the original player ID
            } else {
                alert('Invalid choice.');
                if (failureCallback) failureCallback(); // Indicate failure
            }
        }, 50); // Small delay before showing prompt


        // --- Option 2: Use Modal (Better UX - requires modal HTML/CSS/JS) ---
        /*
        modalText.textContent = promptText;
        modalOptions.innerHTML = ''; // Clear previous options
        availablePlayers.forEach(p => {
            const btn = document.createElement('button');
            btn.textContent = p.name;
            btn.onclick = () => {
                hideModal();
                if (successCallback) successCallback(p.id);
            };
            modalOptions.appendChild(btn);
        });
        // Add a Cancel button maybe?
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.backgroundColor = 'grey'; // Example styling
        cancelBtn.onclick = () => {
             hideModal();
             if (failureCallback) failureCallback();
        }
        modalOptions.appendChild(cancelBtn);

        showModal();
        */
    }

    function checkMaxShots() {
        if (maxShots <= 0) return false; // Unlimited shots, no one gets out this way

        let someoneGotOut = false;
        players.forEach(player => {
            if (!player.isOut && player.shotsTaken >= maxShots) {
                player.isOut = true;
                someoneGotOut = true;
                // Append to action display, don't overwrite
                actionDisplay.textContent += ` ${player.name} reached ${maxShots} shots and is OUT!`;
                console.log(`${player.name} is OUT!`);
            }
        });
        if (someoneGotOut) {
             updatePlayerInfo(); // Update display immediately if someone is out
        }
        return someoneGotOut; // Return true if someone was eliminated this check
    }

    // Helper function to advance index based on play direction
    function advancePlayerIndex() {
         const step = playOrderReversed ? -1 : 1;
         currentPlayerIndex = (currentPlayerIndex + step + players.length) % players.length;
    }


    function nextTurn() {
         if (!gameActive) return;

         advancePlayerIndex(); // Move to the next player according to direction

         // updateTurnIndicator handles skipping already-out players and updating display
         updateTurnIndicator();
     }


    function checkGameOver() {
        // Condition 1: All tiles revealed
        if (revealedTilesCount >= totalTiles) {
            console.log("Game Over: All tiles revealed.");
            return true;
        }

        // Condition 2: Only one (or zero) players left who are not 'out'
        const activePlayersCount = players.filter(p => !p.isOut).length;
        if (players.length > 1 && activePlayersCount <= 1) { // Check only if started with >1 player
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

        const activePlayers = players.filter(p => !p.isOut);
        let resultTitle = '';
        let finalScoresHTML = '<h3>Final Scores:</h3>';

        // Determine winner/result based on who is left
        if (players.length > 1 && activePlayers.length === 1) {
            // Single winner remaining
            resultTitle = `<h2><span>${activePlayers[0].name}</span> is the winner!</h2><p>(Last one standing)</p>`;
        } else if (activePlayers.length === 0 && players.length > 0) {
            // Everyone got out
            resultTitle = `<h2>Everyone is out!</h2><p>No winner this time.</p>`;
        } else {
            // Game ended by tiles running out, or multiple players still active (e.g. started with 1 player)
            // Find player(s) with the fewest shots among those *still active* first
            let potentialWinners = activePlayers;
            if (potentialWinners.length === 0) {
                // If everyone is out but game ended (e.g. last tile made last 2 people out), consider all players
                potentialWinners = players;
            }

             // Sort by shots taken
             potentialWinners.sort((a, b) => a.shotsTaken - b.shotsTaken);

             if (potentialWinners.length > 0) {
                  const minShots = potentialWinners[0].shotsTaken;
                  const winners = potentialWinners.filter(p => p.shotsTaken === minShots);

                  if (winners.length === 1) {
                      resultTitle = `<h2><span>${winners[0].name}</span> wins!</h2><p>(Fewest shots: ${minShots})</p>`;
                  } else if (winners.length > 1) {
                      resultTitle = `<h2>It's a tie!</h2><p>Between <span>${winners.map(p => p.name).join('</span> and <span>')}</span> (${minShots} shots each)</p>`;
                  } else {
                       // Should not happen if potentialWinners had items, but as fallback:
                       resultTitle = `<h2>Game Finished!</h2>`;
                  }
             } else {
                  // No players (maybe started with 0?)
                   resultTitle = `<h2>Game Finished!</h2>`;
             }
        }

        // Generate HTML for final scores list
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
         // Clear options when hiding
         if (modalOptions) modalOptions.innerHTML = '';
         if (modalText) modalText.textContent = '';
    }


}); // End of DOMContentLoaded
