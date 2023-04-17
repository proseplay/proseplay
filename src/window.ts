import { Choice } from "./choice";

const windowTemplate = document.createElement("div");
windowTemplate.classList.add("proseplay-window");
const listTemplate = document.createElement("div");
listTemplate.classList.add("proseplay-list");
windowTemplate.append(listTemplate);

const linkRefTemplate = document.createElement("sup");
linkRefTemplate.classList.add("proseplay-link-ref");

const BUFFER_TIME = 15;
let PADDING: number;

const mouse = { x: 0, y: 0 };

class Window {
  el: HTMLElement;
  listEl: HTMLElement;

  choices: Choice[];
  currentIndex: number;

  isHoverable: boolean;
  private isDragged: boolean;

  linkIndex: number | null;
  private links: Window[] = [];

  functionNames: string[];
  functions: {
    [name: string]: Function
  };

  horizontal: boolean = false;

  constructor(parent: HTMLElement) {
    this.el = windowTemplate.cloneNode(true) as HTMLElement;
    parent.appendChild(this.el);

    this.el.addEventListener("pointerover", this.handlePointerOver);
    this.el.addEventListener("pointerdown", this.handlePointerDown);
    this.el.addEventListener("pointermove", this.handlePointerMove);
    this.el.addEventListener("pointerup", this.handlePointerUp);
    this.el.addEventListener("pointerout", this.handlePointerOut);

    this.listEl = this.el.querySelector(".proseplay-list") as HTMLElement;

    this.choices = [];
    this.currentIndex = 0;

    this.isHoverable = true;
    this.isDragged = false;

    this.linkIndex = null;

    this.functionNames = [];
    this.functions = {};

    PADDING = parseInt(getComputedStyle(parent).fontSize) * 0.3;
  }

  /**
   * Change the direction of the window to horizontal, i.e. east–west.
   */
  setHorizontal(): void {
    this.horizontal = true;
    this.el.classList.add("proseplay-horizontal");
  }

  /**
   * Add a choice to the window.
   * @param choice The choice object to be added.
   */
  addChoice(choice: Choice): void {
    this.choices.push(choice);
    this.listEl.appendChild(choice.el);
  }

  /**
   * Activate the specified choice and adjusts position and sizing accordingly.
   * @param choice The choice to be activated. If none is given, it readjusts to the current choice — this can be useful for resizing.
   */
  activateChoice(choice?: Choice): void {
    if (!choice) {
      choice = this.choices[this.currentIndex];
      if (!this.horizontal) {
        this.listEl.style.top = `-${choice.offsetTop}px`;
      } else {
        this.listEl.style.left = `${-Math.abs(choice.offsetLeft) + PADDING}px`;
      }
    }
    this.currentIndex = this.choices.indexOf(choice);
    this.choices.forEach(otherChoice => otherChoice.deactivate());
    choice.activate();
    this.el.style.width = `${choice.offsetWidth}px`;
  }

  /**
   * Get a random choice index.
   * @returns The random chocie index.
   */
  random(): number {
    return Math.floor(Math.random() * this.choices.length);
  }

  private slideToPos(pos: number): void {
    if (!this.horizontal) {
      this.listEl.style.top = `${pos}px`;
    } else {
      this.listEl.style.left = `${pos}px`;
    }

    const targetChoice = this.getNearestChoice(pos);
    if (!targetChoice) return;

    this.activateChoice(targetChoice);
  }

  /**
   * Slide to a specified index in the window's array of choices.
   * @param choiceIndex Index of choice to slide to.
   */
  slideToChoice(choiceIndex: number, duration?: number) {
    if (choiceIndex > this.choices.length - 1) return;
    const choice = this.choices[choiceIndex];

    this.pointerOver();
    this.pointerDown();

    this.listEl.classList.add("proseplay-has-transition");
    this.listEl.addEventListener("transitionend", e => {
      if (e.target !== this.listEl) return;
      this.listEl.classList.remove("proseplay-has-transition");
    });

    if (duration) {
      this.listEl.style.transitionDuration = `${duration}ms`;
      this.listEl.addEventListener("transitionend", () => {
        this.listEl.style.removeProperty("transition-duration");
      });

      this.choices.forEach(choice => {
        choice.el.style.transitionDuration = `${duration}ms`;
        choice.el.addEventListener("transitionend", () => {
          choice.el.style.removeProperty("transition-duration");
        });
      });

      this.el.style.transitionDuration = `${duration}ms`;
      this.el.addEventListener("transitionend", () => {
        this.el.style.removeProperty("transition-duration");
      });
    }

    setTimeout(() => {
      if (!this.horizontal) {
        this.listEl.style.top = `-${choice.offsetTop}px`;
      } else {
        this.listEl.style.left = `${-Math.abs(choice.offsetLeft) + PADDING}px`;
      }
    }, BUFFER_TIME);

    this.pointerUp();
    this.pointerOut();

    this.activateChoice(choice);
  }

  private getNearestChoice(pos: number): Choice | null {
    let minDist = Infinity;
    let targetChoice: Choice | null = null;
    this.choices.forEach(choice => {
      let dist = !this.horizontal ? Math.abs(pos + choice.offsetTop) : Math.abs(pos + choice.offsetLeft - PADDING);
      if (dist < minDist) {
        minDist = dist;
        targetChoice = choice;
      }
    });
    return targetChoice;
  }

  private snapToNearestChoice(): void {
    const choice = this.getNearestChoice(this.pos);
    if (!choice) return;
    if (!this.horizontal) {
      this.listEl.style.top = `-${choice.offsetTop}px`;
    } else {
      this.listEl.style.left = `${-Math.abs(choice.offsetLeft) + PADDING}px`;
    }
  }

  /**
   * Return either the `left` or `top` of the window's list element, depending on the direction of the window.
   */
  get pos(): number {
    const property = this.horizontal ? "left" : "top";
    return parseInt(getComputedStyle(this.listEl).getPropertyValue(property).replace("px", ""));
  }

  private handlePointerOver = (e: PointerEvent): void => {
    e.preventDefault();

    if (!this.isHoverable) return;

    const target = e.target as HTMLElement;
    if (!target.classList.contains("proseplay-current")) return;

    (this.el.closest(".proseplay") as HTMLElement).querySelectorAll(".proseplay-line").forEach(line => {
      line.classList.add("proseplay-has-hover");
    });
    this.pointerOver();
  }

  pointerOver() {
    this.el.classList.add("proseplay-hover");
  }

  private handlePointerDown = (e: PointerEvent): void => {
    e.preventDefault();

    if (!this.isHoverable) return;

    const target = e.target as HTMLElement;
    if (!target.classList.contains("proseplay-current")) return;

    this.el.setPointerCapture(e.pointerId);

    this.links.forEach(window => window.pointerDown());
    this.isDragged = true;

    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  pointerDown() {
    this.el.classList.add("proseplay-hover");
  }

  private handlePointerMove = (e: PointerEvent): void => {
    e.preventDefault();

    if (!this.isDragged) return;

    const dist = !this.horizontal ? mouse.y - e.clientY : mouse.x - e.clientX;
    this.slideToPos(this.pos - dist);
    this.links.forEach(window => {
      window.slideToPos(this.pos - dist);
    });
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  private handlePointerOut = (): void => {
    if (this.isDragged) return;
    (this.el.closest(".proseplay") as HTMLElement).querySelectorAll(".proseplay-line").forEach(line => {
      line.classList.remove("proseplay-has-hover");
    });
    this.pointerOut();
    this.links.forEach(window => window.pointerOut());
  }
  
  pointerOut() {
    this.isDragged = false;
    this.el.classList.remove("proseplay-hover");
  }

  private handlePointerUp = (e: PointerEvent): void => {
    e.preventDefault();

    this.pointerUp();
    this.links.forEach(window => window.pointerUp());
  }

  pointerUp(): void {
    this.snapToNearestChoice();
    this.isDragged = false;
    this.el.classList.remove("proseplay-hover");

    let functionName = this.functionNames[this.currentIndex];
    if (functionName) {
      if (this.functions[functionName]) {
        this.functions[functionName]();
      }
    }

    (this.el.closest(".proseplay") as HTMLElement).querySelectorAll(".proseplay-line").forEach(line => {
      line.classList.remove("proseplay-has-hover");
    })
  }

  /**
   * Set link between this window and other windows.
   * @param linkIndex Index number of link, as indicated in square brackets.
   * @param otherWindows Array of other windows in the same link.
   */
  setLink(linkIndex: number | null, otherWindows: Window[]): void {
    this.linkIndex = linkIndex;
    if (linkIndex) {
      const sup = linkRefTemplate.cloneNode(true) as HTMLElement;
      this.el.insertAdjacentElement("afterend", sup);
      sup.innerText = `${linkIndex}`;
    }
    this.links = otherWindows;
  }

  /**
   * Set function names.
   * @param functionNames Array of function names.
   */
  setFunctionNames(functionNames: string[]): void {
    this.functionNames = functionNames;
  }

  /**
   * Assign functions to function names.
   * @param name Name of function.
   * @param fnc Function to be called.
   */
  setFunction(name: string, fnc: Function): void {
    this.functions[name] = fnc;
  }
}

export { Window }