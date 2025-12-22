import Phaser from "phaser";

/**
 * A reusable scrollable popup for displaying information text.
 * Creates an overlay with a close button and scrollable content area.
 */
export class InfoPopup {
  private scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Rectangle;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Shows the popup with the given content.
   */
  show(content: string) {
    if (this.isVisible) return;
    
    const { width, height } = this.scene.scale;
    
    // Semi-transparent overlay
    this.overlay = this.scene.add.rectangle(
      0, 0, width, height, 0x000000, 0.75
    ).setOrigin(0, 0).setInteractive();
    
    // Main popup container
    this.container = this.scene.add.container(width / 2, height / 2);
    
    // Popup background (slightly smaller than screen)
    const popupWidth = Math.min(width * 0.85, 700);
    const popupHeight = Math.min(height * 0.8, 600);
    
    const background = this.scene.add.rectangle(
      0, 0, popupWidth, popupHeight, 0x1a2841, 1
    ).setStrokeStyle(3, 0x4a7acd);
    
    // Title
    const title = this.scene.add.text(
      0, -popupHeight / 2 + 30, "Informatie", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#e7f3ff",
      }
    ).setOrigin(0.5, 0.5);
    
    // Close button (X in top right)
    const closeButton = this.scene.add.text(
      popupWidth / 2 - 30, -popupHeight / 2 + 30, "✕", {
        fontFamily: "sans-serif",
        fontSize: "32px",
        color: "#cfe8ff",
      }
    ).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    
    closeButton.on("pointerover", () => {
      closeButton.setColor("#ffffff");
    });
    
    closeButton.on("pointerout", () => {
      closeButton.setColor("#cfe8ff");
    });
    
    closeButton.on("pointerup", () => {
      this.hide();
    });
    
    // Content area - using a zone for scrolling
    const contentMargin = 20;
    const contentWidth = popupWidth - (contentMargin * 2);
    const contentHeight = popupHeight - 120; // Leave room for title and padding
    const contentY = 20; // Position below title
    
    // Create a mask for the scrollable area
    const maskShape = this.scene.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillRect(
      -contentWidth / 2,
      contentY - contentHeight / 2,
      contentWidth,
      contentHeight
    );
    const mask = maskShape.createGeometryMask();
    
    // Content text
    const contentText = this.scene.add.text(
      -contentWidth / 2 + 10,
      contentY - contentHeight / 2 + 10,
      content,
      {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#d4e8ff",
        lineSpacing: 6,
        wordWrap: { width: contentWidth - 20 },
      }
    ).setOrigin(0, 0).setMask(mask);
    
    const textHeight = contentText.height;
    const maxScroll = Math.max(0, textHeight - contentHeight + 20);
    let currentScroll = 0;
    
    // Scroll handling
    if (maxScroll > 0) {
      // Add scroll indicator
      const scrollHint = this.scene.add.text(
        0, popupHeight / 2 - 30, "↓ Scroll om meer te lezen ↓", {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#7ea7ff",
        }
      ).setOrigin(0.5, 0.5).setAlpha(0.8);
      
      this.container.add(scrollHint);
      
      // Mouse wheel scrolling
      this.scene.input.on("wheel", (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
        if (!this.isVisible) return;
        
        currentScroll = Phaser.Math.Clamp(currentScroll + deltaY * 0.3, 0, maxScroll);
        contentText.setY(contentY - contentHeight / 2 + 10 - currentScroll);
        
        // Hide scroll hint when scrolled
        if (currentScroll > 10 && scrollHint.alpha > 0) {
          scrollHint.setAlpha(0);
        }
      });
      
      // Touch scrolling support
      let isDragging = false;
      let startY = 0;
      let startScrollY = 0;
      
      const scrollZone = this.scene.add.zone(
        0,
        contentY,
        contentWidth,
        contentHeight
      ).setInteractive({ useHandCursor: false, draggable: true });
      
      scrollZone.on("dragstart", (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startY = pointer.y;
        startScrollY = currentScroll;
      });
      
      scrollZone.on("drag", (pointer: Phaser.Input.Pointer) => {
        if (!isDragging) return;
        
        const deltaY = startY - pointer.y;
        currentScroll = Phaser.Math.Clamp(startScrollY + deltaY, 0, maxScroll);
        contentText.setY(contentY - contentHeight / 2 + 10 - currentScroll);
        
        if (currentScroll > 10 && scrollHint.alpha > 0) {
          scrollHint.setAlpha(0);
        }
      });
      
      scrollZone.on("dragend", () => {
        isDragging = false;
      });
      
      this.container.add(scrollZone);
    }
    
    // Add all elements to container
    this.container.add([background, title, closeButton, contentText]);
    
    // Set depth to appear above everything
    this.overlay.setDepth(1000);
    this.container.setDepth(1001);
    
    this.isVisible = true;
  }

  /**
   * Hides the popup.
   */
  hide() {
    if (!this.isVisible) return;
    
    // Remove wheel listener
    this.scene.input.off("wheel");
    
    this.overlay?.destroy();
    this.container?.destroy();
    
    this.overlay = undefined;
    this.container = undefined;
    this.isVisible = false;
  }

  /**
   * Cleans up the popup.
   */
  destroy() {
    this.hide();
  }
}
