// Main application entry point
// Handles Pixi.js setup, UI creation, and game initialization
//
// TODO: Break this large file into smaller, focused modules
// TODO: Extract UI components into separate classes
// TODO: Implement game state management system

import { handleGameRound } from "./game/gameRoundHelper";
import { initializeRGS } from "./rgs";
import {
  Application,
  Assets,
  Sprite,
  Graphics,
  Container,
  Text,
  TextStyle,
} from "pixi.js";
import { getAdjustedScale } from "./ui/uiScaleHelper";
import {
  createBGAnimationGroup,
  LayoutContainer,
} from "./animations/BGAnimationGroup";
import { createCupGameSequence } from "./animations/AnimationLogic";
import { createForegroundAnimationGroup } from "./animations/ForegroundAnimationGroup";
import * as PIXI_SOUND from "pixi-sound";

// --- Global sound effect helper for all clickable elements ---
// TODO: Extract to a separate UI utility module
// TODO: Add volume control and sound preference management
function addSoundToClickable(obj: Container | Sprite) {
  obj.eventMode = "static";
  obj.cursor = "pointer";
  obj.interactive = true;
  obj.on("pointerover", () => {
    if (sessionStorage.getItem("soundEnabled") === "1") {
      PIXI_SOUND.default.play("hover");
    }
  });
  obj.on("pointertap", () => {
    if (sessionStorage.getItem("soundEnabled") === "1") {
      PIXI_SOUND.default.play("press");
    }
  });
}

// Initialize RGS (Remote Game Server) on load
initializeRGS().catch(console.error);

(async () => {
  // --- Session-based sound enablement ---
  let soundEnabled = sessionStorage.getItem("soundEnabled");
  if (soundEnabled === null) {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0,0,0,0.85)";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.justifyContent = "center";
    overlay.style.alignItems = "center";
    overlay.style.zIndex = "9999";
    overlay.innerHTML = `
      <div style="color:#fff;font-size:2rem;margin-bottom:2rem;">Enable sound effects?</div>
      <div>
        <button id="sound-yes" style="font-size:1.2rem;padding:1rem 2rem;margin:0 1rem;">Play with Sound</button>
        <button id="sound-no" style="font-size:1.2rem;padding:1rem 2rem;margin:0 1rem;">Play without Sound</button>
      </div>
    `;
    document.body.appendChild(overlay);
    await new Promise<void>((resolve) => {
      overlay.querySelector("#sound-yes")!.addEventListener("click", () => {
        sessionStorage.setItem("soundEnabled", "1");
        overlay.remove();
        resolve();
      });
      overlay.querySelector("#sound-no")!.addEventListener("click", () => {
        sessionStorage.setItem("soundEnabled", "0");
        overlay.remove();
        resolve();
      });
    });
    soundEnabled = sessionStorage.getItem("soundEnabled");
  }
  // --- Sound Effects with PixiJS Sound ---
  const hoverSoundUrl = new URL("./assets/sfx-hover.mp3", import.meta.url).href;
  const pressSoundUrl = new URL("./assets/sfx-press.mp3", import.meta.url).href;
  const winSoundUrl = new URL("./assets/win.mp3", import.meta.url).href;
  PIXI_SOUND.default.add("hover", hoverSoundUrl);
  PIXI_SOUND.default.add("press", pressSoundUrl);
  PIXI_SOUND.default.add("win", winSoundUrl);

  // --- Create Pixi Application
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });

  document.getElementById("pixi-container")!.appendChild(app.canvas);
  app.canvas.style.width = "100vw";
  app.canvas.style.height = "100vh";
  window.dispatchEvent(new Event("resize"));

  // --- Background Animation Group
  const BGAnimationGroup: LayoutContainer = await createBGAnimationGroup(app);
  app.stage.addChild(BGAnimationGroup);

  // --- Foreground Animation Group
  const ForegroundAnimationGroup = await createForegroundAnimationGroup(app);
  app.stage.addChild(ForegroundAnimationGroup);

  // --- Loader Bar Animation ---
  const loaderFrames: Sprite[] = [];
  for (let i = 1; i <= 6; i++) {
    const url = new URL(`./assets/loader (${i}).png`, import.meta.url).href;
    const tex = await Assets.load(url);
    const frame = new Sprite(tex);
    frame.anchor.set(0.5);
    frame.position.set(app.screen.width / 2, app.screen.height / 2 - 120);
    frame.visible = false;
    app.stage.addChild(frame);
    loaderFrames.push(frame);
  }
  let loaderIndex = 0;
  loaderFrames[loaderIndex].visible = true;
  let loaderElapsed = 0;
  let loaderActive = true;
  setTimeout(() => {
    loaderActive = false;
    loaderFrames.forEach((f) => (f.visible = false));
  }, 2000);

  // --- Bet Input Area ---
  // TODO: Extract bet input to separate UI component
  // TODO: Add bet validation and limits
  // TODO: Support different currencies
  const betSteps = [
    0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4,
    5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80,
    85, 90, 95, 100,
  ];
  for (let v = 125; v <= 1000; v += 25) betSteps.push(v / 1);
  let betIndex = betSteps.indexOf(1);
  let betValue = betSteps[betIndex];

  const betInput: Container = new Container();
  let betText: Text;

  function updateBetText() {
    betText.text = `$${betValue.toLocaleString(undefined, { minimumFractionDigits: betValue < 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  }

  function buildBetInput() {
    betInput.removeChildren();
    const scale = getAdjustedScale(app.screen.width, app.screen.height);
    const bg = new Graphics();
    const bgWidth = 300 * scale;
    const bgHeight = 60 * scale;
    bg.beginFill(0x1a2233, 0.98);
    bg.drawRoundedRect(0, 0, bgWidth, bgHeight, 22 * scale);
    bg.endFill();
    bg.beginFill(0x000000, 0.18);
    bg.drawRoundedRect(6 * scale, 6 * scale, bgWidth, bgHeight, 22 * scale);
    bg.endFill();
    betInput.addChild(bg);

    const minusBtn = new Container();
    const minusBg = new Graphics();
    minusBg
      .beginFill(0x28324a, 1)
      .drawRoundedRect(0, 0, 38 * scale, 38 * scale, 12 * scale)
      .endFill();
    minusBg.beginFill(0x000000, 0.12);
    minusBg.drawRoundedRect(
      3 * scale,
      3 * scale,
      38 * scale,
      38 * scale,
      12 * scale,
    );
    minusBg.endFill();
    minusBtn.addChild(minusBg);
    const minusTxt = new Text({
      text: "-",
      style: new TextStyle({
        fontSize: 26 * scale,
        fill: "#fff",
        fontWeight: "bold",
      }),
    });
    minusTxt.anchor.set(0.5);
    minusTxt.position.set(19 * scale, 19 * scale);
    minusBtn.addChild(minusTxt);
    addSoundToClickable(minusBtn);
    minusBtn.on("pointertap", () => {
      if (betIndex > 0) {
        betIndex--;
        betValue = betSteps[betIndex];
        updateBetText();
      }
    });

    betText = new Text({
      text: "",
      style: new TextStyle({
        fontSize: 30 * scale,
        fill: "#b0e0ff",
        fontWeight: "bold",
        dropShadow: true,
        letterSpacing: 1.5 * scale,
      }),
    });
    updateBetText();
    betText.anchor.set(0.5);

    const plusBtn = new Container();
    const plusBg = new Graphics();
    plusBg
      .beginFill(0x28324a, 1)
      .drawRoundedRect(0, 0, 38 * scale, 38 * scale, 12 * scale)
      .endFill();
    plusBg.beginFill(0x000000, 0.12);
    plusBg.drawRoundedRect(
      3 * scale,
      3 * scale,
      38 * scale,
      38 * scale,
      12 * scale,
    );
    plusBg.endFill();
    plusBtn.addChild(plusBg);
    const plusTxt = new Text({
      text: "+",
      style: new TextStyle({
        fontSize: 26 * scale,
        fill: "#fff",
        fontWeight: "bold",
      }),
    });
    plusTxt.anchor.set(0.5);
    plusTxt.position.set(19 * scale, 19 * scale);
    plusBtn.addChild(plusTxt);
    addSoundToClickable(plusBtn);
    plusBtn.on("pointertap", () => {
      if (betIndex < betSteps.length - 1) {
        betIndex++;
        betValue = betSteps[betIndex];
        updateBetText();
      }
    });

    minusBtn.position.set(50 * scale, 11 * scale);
    betText.position.set(bgWidth / 2, bgHeight / 2);
    plusBtn.position.set(bgWidth - 50 * scale - 38 * scale, 11 * scale);
    betInput.addChild(minusBtn);
    betInput.addChild(betText);
    betInput.addChild(plusBtn);
  }
  buildBetInput();
  app.stage.addChild(betInput);

  // --- Play and Start Buttons ---
  // Combined Play/Start Button
  const playStartButton: Container = new Container();
  let playStartButtonBg: Graphics;
  let playStartButtonTxt: Text;
  let playStartButtonDisabled = false;
  let playStartButtonState: "ready" | "waiting" | "choose" = "ready";

  function buildPlayStartButton() {
    playStartButton.removeChildren();
    playStartButton.removeAllListeners("pointertap");
    const scale = getAdjustedScale(app.screen.width, app.screen.height);
    const bgWidth = 352 * scale; // 160*2 + 32 spacing
    const bgHeight = 48 * scale;
    playStartButtonBg = new Graphics();
    playStartButtonBg.beginFill(0x000000, 0.18);
    playStartButtonBg.drawRoundedRect(
      4 * scale,
      4 * scale,
      bgWidth,
      bgHeight,
      18 * scale,
    );
    playStartButtonBg.endFill();
    playStartButtonBg.beginFill(0xd32f2f, 1);
    playStartButtonBg.drawRoundedRect(0, 0, bgWidth, bgHeight, 18 * scale);
    playStartButtonBg.endFill();
    playStartButton.addChild(playStartButtonBg);
    let buttonText = "Play / Start";
    let buttonFill = "#fff";
    if (playStartButtonState === "waiting") {
      buttonText = "Choose a Cup";
      buttonFill = "#ffd700";
    } else if (playStartButtonDisabled) {
      buttonText = "Play / Start";
      buttonFill = "#aaa";
    }
    playStartButtonTxt = new Text({
      text: buttonText,
      style: new TextStyle({
        fontSize: 22 * scale,
        fill: buttonFill,
        fontWeight: "bold",
        dropShadow: true,
        letterSpacing: 1.2 * scale,
      }),
    });
    playStartButtonTxt.anchor.set(0.5);
    playStartButtonTxt.position.set(bgWidth / 2, bgHeight / 2);
    playStartButton.addChild(playStartButtonTxt);
    playStartButton.eventMode = playStartButtonDisabled ? "none" : "static";
    playStartButton.cursor = playStartButtonDisabled ? "default" : "pointer";
    if (!playStartButtonDisabled) {
      playStartButton.on("pointertap", async () => {
        setPlayStartButtonDisabled(true);

        // Update balance display from RGS state before game round
        updateBalanceFromRGS();

        try {
          // Execute game round - RGS handles all balance logic
          const { executeGameRound } = await import("./rgs");
          await executeGameRound(betValue);

          // Normal flow: animation, then choose a cup
          playStartButtonState = "waiting";
          buildPlayStartButton();
          await runAnimationSequence();
          await handleGameRound({
            ForegroundAnimationGroup,
            diamondSprite,
            liftCup,
            lowerCup,
            onRest: () => {
              setPlayStartButtonDisabled(false);
              playStartButtonState = "ready";
              buildPlayStartButton();
              // Update balance from RGS after game completes
              updateBalanceFromRGS();
            },
            onBalanceUpdate,
            balanceText,
            showWinModal,
            betAmount: betValue, // Pass bet amount to game round handler
          });
        } catch (err) {
          const { isActiveBetError } = await import("./rgs");
          if (isActiveBetError(err)) {
            // Handle active bet error: skip animation, prompt choose a cup
            playStartButtonState = "waiting";
            buildPlayStartButton();
            await handleGameRound({
              ForegroundAnimationGroup,
              diamondSprite,
              liftCup,
              lowerCup,
              onRest: () => {
                setPlayStartButtonDisabled(false);
                playStartButtonState = "ready";
                buildPlayStartButton();
                // Update balance from RGS after game completes
                updateBalanceFromRGS();
              },
              onBalanceUpdate,
              balanceText,
              showWinModal,
              betAmount: betValue, // Pass bet amount to game round handler
              skipAnimation: true,
              forceEndRound: true,
            });
          } else {
            // Handle other errors with user feedback
            console.error("Game round failed:", err);
            showErrorModal(
              err instanceof Error
                ? `Game error: ${err.message}`
                : "An unexpected error occurred. Please try again.",
            );

            // Re-enable play button and update balance from RGS
            setPlayStartButtonDisabled(false);
            updateBalanceFromRGS();
          }
        }
      });
      playStartButton.on("pointerover", () => {
        playStartButtonBg.tint = 0xff5252;
        playStartButton.scale.set(1.08);
      });
      playStartButton.on("pointerout", () => {
        playStartButtonBg.tint = 0xffffff;
        playStartButton.scale.set(1);
      });
      playStartButton.on("pointerdown", () => {
        playStartButton.scale.set(0.95);
      });
      playStartButton.on("pointerup", () => {
        playStartButton.scale.set(1.08);
      });
      playStartButton.on("pointerupoutside", () => {
        playStartButton.scale.set(1);
      });
    }
    addSoundToClickable(playStartButton);
  }

  function setPlayStartButtonDisabled(disabled: boolean) {
    playStartButtonDisabled = disabled;
    buildPlayStartButton();
  }

  buildPlayStartButton();

  // ...existing code...

  // Placeholder for animation sequence

  // Simple shuffle animation: move cups left/right 6 times
  // Diamond sprite for reveal (create or load as needed)
  const diamondTexture = await Assets.load(
    new URL("./assets/diamond (1).png", import.meta.url).href,
  );
  const diamondSprite = new Sprite(diamondTexture);
  diamondSprite.anchor.set(0.5, 1);
  diamondSprite.visible = false;
  ForegroundAnimationGroup.addChild(diamondSprite);

  // Animation sequence using AnimationLogic
  // --- Cup click and win/loss logic ---

  async function runAnimationSequence() {
    const anim = createCupGameSequence(
      ForegroundAnimationGroup.cupSprites,
      ForegroundAnimationGroup.prizeSprite,
      diamondSprite,
      ForegroundAnimationGroup,
      () => {
        // Make cups clickable here
        ForegroundAnimationGroup.cupSprites.forEach((cup) => {
          cup.eventMode = "static";
          cup.cursor = "pointer";
          cup.interactive = true;
          cup.removeAllListeners();
        });
      },
    );
    await anim.runSequence();
    // Reset cup positions after shuffle if needed
    if (typeof ForegroundAnimationGroup.layout === "function")
      ForegroundAnimationGroup.layout();
  }

  // onCupPick is now handled by the abstraction via handleGameRound

  // Animation helpers (should match AnimationLogic)
  function liftCup(cup: Sprite, liftHeight = 80, duration = 220) {
    return new Promise<void>((resolve) => {
      const startY = cup.y;
      let t = 0;
      function animate() {
        t += 16;
        cup.y =
          startY - liftHeight * Math.sin(Math.PI * Math.min(t / duration, 1));
        cup.zIndex = 10;
        if (t < duration) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      animate();
    });
  }
  function lowerCup(cup: Sprite, liftHeight = 80, duration = 220) {
    return new Promise<void>((resolve) => {
      const startY = cup.y;
      let t = 0;
      function animate() {
        t += 16;
        cup.y =
          startY + liftHeight * Math.sin(Math.PI * Math.min(t / duration, 1));
        cup.zIndex = 1;
        if (t < duration) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      animate();
    });
  }

  // ...existing code...
  app.stage.addChild(playStartButton);
  // --- Balance and Sound Toggle ---
  let balance = 1000;
  const style = new TextStyle({ fontSize: 20, fill: "#fff" });
  const balanceText = new Text({ text: `Balance: $${balance}`, style });
  balanceText.anchor.set(0, 0);
  balanceText.position.set(20, 20);
  app.stage.addChild(balanceText);

  // Function to update balance display from RGS state
  function updateBalanceFromRGS() {
    import("./rgs").then(({ getBalance }) => {
      balance = getBalance();
      balanceText.text = `Balance: $${balance}`;
    });
  }

  let soundEnabledState = sessionStorage.getItem("soundEnabled") === "1";
  const soundToggle = new Container();
  const toggleBg = new Graphics();
  const toggleWidth = 36;
  const toggleHeight = 36;
  function drawToggleBg() {
    toggleBg.clear();
    toggleBg.beginFill(soundEnabledState ? 0x4caf50 : 0xb71c1c, 0.95);
    toggleBg.drawRoundedRect(0, 0, toggleWidth, toggleHeight, 10);
    toggleBg.endFill();
  }
  drawToggleBg();
  soundToggle.addChild(toggleBg);
  const iconText = new Text({
    text: soundEnabledState ? "🔊" : "🔇",
    style: new TextStyle({ fontSize: 20, fill: "#fff" }),
  });
  iconText.anchor.set(0.5);
  iconText.position.set(toggleWidth / 2, toggleHeight / 2);
  soundToggle.addChild(iconText);
  addSoundToClickable(soundToggle);
  soundToggle.on("pointertap", () => {
    soundEnabledState = !soundEnabledState;
    sessionStorage.setItem("soundEnabled", soundEnabledState ? "1" : "0");
    iconText.text = soundEnabledState ? "🔊" : "🔇";
    drawToggleBg();
  });
  app.stage.addChild(soundToggle);

  // --- Centralized Layout Handler ---
  function layoutUI() {
    const scale = getAdjustedScale(app.screen.width, app.screen.height);

    // BG animation group
    if (typeof BGAnimationGroup.layout === "function")
      BGAnimationGroup.layout();

    // Foreground animation group
    if (typeof ForegroundAnimationGroup.layout === "function")
      ForegroundAnimationGroup.layout();

    // Bet Input
    const betInputBgWidth = 300 * scale;
    const betInputBgHeight = 60 * scale;
    betInput.x = (app.screen.width - betInputBgWidth) / 2;
    betInput.y = app.screen.height - betInputBgHeight - 32 * scale;
    buildBetInput();

    // Play/Start Button
    const buttonWidth = 352 * scale;
    const buttonHeight = 48 * scale;
    playStartButton.x = (app.screen.width - buttonWidth) / 2;
    playStartButton.y = betInput.y - buttonHeight - 24 * scale;
    buildPlayStartButton();

    // Balance
    balanceText.position.set(20, 20);

    // Sound Toggle
    soundToggle.x = 20;
    soundToggle.y = balanceText.y + balanceText.height + 8;
  }
  app.renderer.on("resize", layoutUI);
  layoutUI();

  // --- Animate loader ---
  app.ticker.add((time) => {
    if (loaderActive) {
      loaderElapsed += time.deltaMS;
      if (loaderElapsed > 120) {
        loaderFrames[loaderIndex].visible = false;
        loaderIndex = (loaderIndex + 1) % loaderFrames.length;
        loaderFrames[loaderIndex].visible = true;
        loaderElapsed = 0;
      }
    }
  });

  // --- Play logic and API hooks ---
  // onCupPick is handled by the abstraction

  // ...existing code...

  function onBalanceUpdate(endRoundResponse: { balance: { amount: number } }) {
    if (
      endRoundResponse &&
      endRoundResponse.balance &&
      typeof endRoundResponse.balance.amount === "number"
    ) {
      balance = endRoundResponse.balance.amount / 1000000;
    }
    balanceText.text = `Balance: $${balance}`;
  }

  // ...existing code...

  // --- Info Modal ---
  let infoModal: Container | null = null;
  function showInfoModal() {
    if (infoModal) return;
    infoModal = new Container();
    infoModal.zIndex = 1000; // Ensure modal appears above all other elements
    const modalWidth = app.screen.width * 0.92;
    const modalHeight = app.screen.height * 0.7;
    const bg = new Graphics();
    bg.beginFill(0x000000, 0.85);
    bg.drawRoundedRect(0, 0, modalWidth, modalHeight, 32);
    bg.endFill();
    infoModal.addChild(bg);

    const scrollArea = new Container();
    const scrollMask = new Graphics();
    scrollMask.beginFill(0xffffff);
    scrollMask.drawRoundedRect(0, 0, modalWidth - 60, modalHeight - 60, 16);
    scrollMask.endFill();
    scrollArea.mask = scrollMask;
    scrollArea.addChild(scrollMask);

    const infoText = new Text({
      text:
        "Molly’s Cups 10X – Game Information\n\n" +
        "Game Overview\n" +
        "Molly’s Cups 10X is a simple yet exciting game of chance inspired by the classic ‘three cup’ street game. A prize is hidden under one of three cups, and the player’s objective is to pick the correct cup. If you choose correctly, you win 10X your bet. If not, the round results in 0X.\n\n" +
        "Game Rules\n" +
        "- Select your wager before the round begins.\n" +
        "- Three cups will be displayed on the screen, one hiding the prize.\n" +
        "- Choose one cup.\n" +
        "- The outcome is revealed instantly after your selection:\n" +
        "    - Correct pick: Win 10X your wager.\n" +
        "    - Incorrect pick: No win (0X).\n\n" +
        "Return to Player (RTP)\n" +
        "The long-term expected return to player (RTP) is 96%.\n" +
        "Individual game results may vary significantly from the stated RTP in the short term.\n\n" +
        "Important Disclosures\n" +
        "- This is a game of chance; there is no skill element.\n" +
        "- Visual shuffles, animations, or other effects shown on-screen are for entertainment purposes only and do not influence the server-determined outcome.\n" +
        "- The game server independently generates the result before the visual sequence is displayed.\n\n" +
        "Summary\n" +
        "Molly’s Cups 10X offers a straightforward and fast-paced experience: pick the right cup for a 10X win or lose your bet. With a fair RTP of 96%, the game balances excitement with transparency, delivering clear outcomes every round.",
      style: new TextStyle({
        fontSize: 22,
        fill: "#fff",
        wordWrap: true,
        wordWrapWidth: modalWidth - 80,
      }),
    });
    infoText.position.set(0, 0);
    scrollArea.addChild(infoText);
    scrollArea.position.set(40, 40);
    infoModal.addChild(scrollArea);
    scrollArea.addChild(scrollMask);

    let scrollY = 0;
    const maxScroll = Math.max(0, infoText.height - (modalHeight - 60));
    scrollArea.interactive = true;
    scrollArea.eventMode = "static";
    scrollArea.on("wheel", (event: WheelEvent) => {
      scrollY -= event.deltaY;
      scrollY = Math.max(Math.min(scrollY, 0), -maxScroll);
      infoText.position.y = scrollY;
    });

    const closeBtn = new Text({
      text: "Close",
      style: new TextStyle({ fontSize: 20, fill: "#ffb", fontWeight: "bold" }),
    });
    closeBtn.interactive = true;
    closeBtn.cursor = "pointer";
    closeBtn.position.set(bg.width - 100, 20);
    closeBtn.on("pointertap", () => {
      app.stage.removeChild(infoModal!);
      infoModal = null;
    });
    infoModal.addChild(closeBtn);

    infoModal.position.set(
      (app.screen.width - bg.width) / 2,
      (app.screen.height - bg.height) / 2,
    );
    app.stage.addChild(infoModal);
  }

  // --- Error Display ---
  let errorModal: Container | null = null;
  function showErrorModal(errorMessage: string) {
    if (errorModal) return;

    errorModal = new Container();
    errorModal.zIndex = 1002; // Higher than win modal

    const modalWidth = Math.min(app.screen.width * 0.8, 400);
    const modalHeight = Math.min(app.screen.height * 0.4, 200);

    const bg = new Graphics();
    bg.beginFill(0xd32f2f, 0.95); // Red background for error
    bg.drawRoundedRect(0, 0, modalWidth, modalHeight, 20);
    bg.endFill();

    // Add red border
    bg.lineStyle(4, 0xb71c1c, 1);
    bg.drawRoundedRect(0, 0, modalWidth, modalHeight, 20);

    errorModal.addChild(bg);

    // Error title
    const errorTitle = new Text({
      text: "⚠️ Error",
      style: new TextStyle({
        fontSize: 28,
        fill: "#ffffff",
        fontWeight: "bold",
        align: "center",
      }),
    });
    errorTitle.anchor.set(0.5);
    errorTitle.position.set(modalWidth / 2, modalHeight / 4);
    errorModal.addChild(errorTitle);

    // Error message
    const errorText = new Text({
      text: errorMessage,
      style: new TextStyle({
        fontSize: 18,
        fill: "#ffffff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: modalWidth - 40,
      }),
    });
    errorText.anchor.set(0.5);
    errorText.position.set(modalWidth / 2, modalHeight / 2);
    errorModal.addChild(errorText);

    // Close button
    const closeBtn = new Text({
      text: "OK",
      style: new TextStyle({
        fontSize: 18,
        fill: "#ffffff",
        fontWeight: "bold",
      }),
    });
    closeBtn.interactive = true;
    closeBtn.cursor = "pointer";
    closeBtn.anchor.set(0.5);
    closeBtn.position.set(modalWidth / 2, modalHeight * 0.8);
    closeBtn.on("pointertap", () => {
      app.stage.removeChild(errorModal!);
      errorModal = null;
    });
    addSoundToClickable(closeBtn);
    errorModal.addChild(closeBtn);

    // Position and show modal
    errorModal.position.set(
      (app.screen.width - modalWidth) / 2,
      (app.screen.height - modalHeight) / 2,
    );

    app.stage.addChild(errorModal);
  }

  // --- Win Modal ---
  let winModal: Container | null = null;
  function showWinModal(winAmount: number) {
    if (winModal) return;

    // Play win sound
    if (sessionStorage.getItem("soundEnabled") === "1") {
      PIXI_SOUND.default.play("win", { volume: 0.9 });
    }

    winModal = new Container();
    winModal.zIndex = 1001; // Higher than info modal

    const modalWidth = Math.min(app.screen.width * 0.8, 400);
    const modalHeight = Math.min(app.screen.height * 0.6, 300);

    const bg = new Graphics();
    bg.beginFill(0x2e7d32, 0.95); // Green background for win
    bg.drawRoundedRect(0, 0, modalWidth, modalHeight, 20);
    bg.endFill();

    // Add golden border
    bg.lineStyle(4, 0xffd700, 1);
    bg.drawRoundedRect(0, 0, modalWidth, modalHeight, 20);

    winModal.addChild(bg);

    // Win title
    const winTitle = new Text({
      text: "🎉 WINNER! 🎉",
      style: new TextStyle({
        fontSize: 36,
        fill: "#ffd700",
        fontWeight: "bold",
        dropShadow: {
          color: 0x000000,
          distance: 2,
        },
        align: "center",
      }),
    });
    winTitle.anchor.set(0.5);
    winTitle.position.set(modalWidth / 2, modalHeight / 4);
    winModal.addChild(winTitle);

    // Win amount
    const winText = new Text({
      text: `You won $${winAmount.toFixed(2)}!`,
      style: new TextStyle({
        fontSize: 24,
        fill: "#ffffff",
        fontWeight: "bold",
        align: "center",
      }),
    });
    winText.anchor.set(0.5);
    winText.position.set(modalWidth / 2, modalHeight / 2);
    winModal.addChild(winText);

    // Auto-dismiss countdown text
    const countdownText = new Text({
      text: "Auto-closing in 2 seconds...",
      style: new TextStyle({
        fontSize: 14,
        fill: "#cccccc",
        align: "center",
      }),
    });
    countdownText.anchor.set(0.5);
    countdownText.position.set(modalWidth / 2, modalHeight * 0.75);
    winModal.addChild(countdownText);

    // Close button (still available for manual dismissal)
    const closeBtn = new Text({
      text: "Continue",
      style: new TextStyle({
        fontSize: 16,
        fill: "#ffd700",
        fontWeight: "bold",
      }),
    });
    closeBtn.interactive = true;
    closeBtn.cursor = "pointer";
    closeBtn.anchor.set(0.5);
    closeBtn.position.set(modalWidth / 2, modalHeight * 0.9);

    const dismissModal = () => {
      if (winModal) {
        app.stage.removeChild(winModal);
        winModal = null;
      }
    };

    closeBtn.on("pointertap", dismissModal);
    addSoundToClickable(closeBtn);
    winModal.addChild(closeBtn);

    // Animate modal appearance
    winModal.scale.set(0.1);
    winModal.position.set(
      (app.screen.width - modalWidth) / 2,
      (app.screen.height - modalHeight) / 2,
    );

    app.stage.addChild(winModal);

    // Scale animation
    const animateIn = () => {
      let scale = 0.1;
      const animate = () => {
        scale += 0.05;
        winModal!.scale.set(Math.min(scale, 1));
        if (scale < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    };
    animateIn();

    // Auto-dismiss after 1.5 seconds with countdown
    let countdown = 2;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownText && winModal) {
        countdownText.text =
          countdown > 0
            ? `Auto-closing in ${countdown} second${countdown !== 1 ? "s" : ""}...`
            : "Closing...";
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(countdownInterval);
      dismissModal();
    }, 2000);
  }

  function createPixiButton(yOffset: number, onClick: () => void): Container {
    const button = new Container();
    const icon = new Text({
      text: "i",
      style: new TextStyle({
        fontSize: 22,
        fill: "#fff",
        fontWeight: "bold",
        fontFamily: "Arial",
        align: "center",
      }),
    });
    function resizeButton() {
      const size = 40;
      button.width = size;
      button.height = size;
      button.position.set(app.screen.width - size - 20, 20 + yOffset);
      icon.style.fontSize = size * 0.6;
      icon.anchor.set(0.5);
      icon.position.set(size / 2, size / 2);
      bg.clear();
      bg.beginFill(0x222a38, 0.95);
      bg.drawRoundedRect(0, 0, size, size, size * 0.25);
      bg.endFill();
      bg.beginFill(0x000000, 0.15);
      bg.drawRoundedRect(4, 4, size, size, size * 0.25);
      bg.endFill();
    }
    const bg = new Graphics();
    button.addChild(bg);
    button.addChild(icon);
    addSoundToClickable(button);
    button.on("pointerover", () => {
      bg.tint = 0x009aff;
      button.scale.set(1.08);
    });
    button.on("pointerout", () => {
      bg.tint = 0xffffff;
      button.scale.set(1);
    });
    button.on("pointertap", onClick);
    resizeButton();
    app.stage.addChild(button);
    app.renderer.on("resize", resizeButton);
    return button;
  }

  // Info button (only create if screen is large enough)
  if (window.innerWidth > 400 && window.innerHeight > 300) {
    createPixiButton(0, showInfoModal);
    window.dispatchEvent(new Event("resize"));
  }

  // Responsive: update icon positions and modal on resize
  app.renderer.on("resize", () => {
    balanceText.position.set(20, 20);
    if (infoModal) {
      infoModal.position.set(
        (app.screen.width - infoModal.width) / 2,
        (app.screen.height - infoModal.height) / 2,
      );
    }
  });
})();
