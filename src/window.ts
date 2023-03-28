import { Choice } from "./choice";

const windowTemplate = document.createElement("div");
windowTemplate.classList.add("proseplay-window");
const listTemplate = document.createElement("div");
listTemplate.classList.add("proseplay-list");
windowTemplate.append(listTemplate);

const linkRefTemplate = document.createElement("sup");
linkRefTemplate.classList.add("proseplay-link-ref");

const TRANSITION_TIME = 15;
let PADDING: number;

const mouse = { x: 0, y: 0 };

class Window {
  static template: HTMLElement;
  static linkRefTemplate: HTMLElement;

  el: HTMLElement;
  listEl: HTMLElement;

  choices: Choice[];
  currentChoiceIndex: number;

  isHoverable: boolean;
  isDragged: boolean;

  linkIndex: number | null;
  links: Window[] = [];

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
    this.currentChoiceIndex = 0;

    this.isHoverable = true;
    this.isDragged = false;

    this.linkIndex = null;

    this.functionNames = [];
    this.functions = {};

    PADDING = parseInt(getComputedStyle(parent).fontSize) * 0.3;
  }

  setHorizontal(): void {
    this.horizontal = true;
    this.el.classList.add("proseplay-horizontal");
  }

  addChoice(choice: Choice): void {
    this.choices.push(choice);
    this.listEl.appendChild(choice.el);
  }

  activateChoice(choice?: Choice): void {
    if (!choice) {
      choice = this.choices[this.currentChoiceIndex];
      if (!this.horizontal) {
        this.listEl.style.top = `-${choice.offsetTop}px`;
      } else {
        this.listEl.style.left = `${-Math.abs(choice.offsetLeft) + PADDING}px`;
      }
    }
    this.currentChoiceIndex = this.choices.indexOf(choice);
    this.choices.forEach(otherChoice => otherChoice.deactivate());
    choice.activate();
    this.el.style.width = `${choice.el.offsetWidth}px`;
  }

  random(choiceIndex?: number): number {
    if (choiceIndex === undefined) {
      choiceIndex = Math.floor(Math.random() * this.choices.length);
    }
    if (choiceIndex > this.choices.length - 1) {
      choiceIndex = this.choices.length - 1;
    }
    const choice = this.choices[choiceIndex];
    this.activateChoice(choice);

    this.listEl.classList.add("proseplay-has-transition");
    setTimeout(() => this.listEl.classList.remove("proseplay-has-transition"), TRANSITION_TIME);
    if (!this.horizontal) {
      this.listEl.style.top = `-${choice.offsetTop}px`;
    } else {
      this.listEl.style.left = `${-Math.abs(choice.offsetLeft) + PADDING}px`;
    }

    return choiceIndex;
  }

  slideTo(pos: number): void {
    if (!this.horizontal) {
      this.listEl.style.top = `${pos}px`;
    } else {
      this.listEl.style.left = `${pos}px`;
    }

    const targetChoice = this.getNearestChoice(pos);
    if (!targetChoice) return;

    this.activateChoice(targetChoice);
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

  get top(): number {
    return parseInt(getComputedStyle(this.listEl).getPropertyValue("top").replace("px", ""));
  }
  get left(): number {
    return parseInt(getComputedStyle(this.listEl).getPropertyValue("left").replace("px", ""));
  }
  get pos(): number {
    if (!this.horizontal) {
      return parseInt(getComputedStyle(this.listEl).getPropertyValue("top").replace("px", ""));
    } else {
      return parseInt(getComputedStyle(this.listEl).getPropertyValue("left").replace("px", ""));
    }
  }

  handlePointerOver = (e: PointerEvent): void => {
    e.preventDefault();

    if (!this.isHoverable) return;

    const target = e.target as HTMLElement;
    if (!target.classList.contains("proseplay-current")) return;

    this.pointerOver();
    this.links.forEach(window => window.pointerOver());
  }
  
  pointerOver() {
    this.el.classList.add("proseplay-hover");
    (this.el.parentElement as HTMLElement).classList.add("proseplay-has-hover");
  }

  handlePointerDown = (e: PointerEvent): void => {
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

  handlePointerMove = (e: PointerEvent): void => {
    e.preventDefault();

    if (!this.isDragged) return;

    const dist = !this.horizontal ? mouse.y - e.clientY : mouse.x - e.clientX;
    this.slideTo(this.pos - dist);
    this.links.forEach(window => {
      window.slideTo(this.pos - dist);
    });
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  handlePointerOut = (): void => {
    if (this.isDragged) return;
    this.pointerOut();
    this.links.forEach(window => window.pointerOut());
  }
  
  pointerOut() {
    this.isDragged = false;
    this.el.classList.remove("proseplay-hover");
    (this.el.parentElement as HTMLElement).classList.remove("proseplay-has-hover");
  }

  handlePointerUp = (e: PointerEvent): void => {
    e.preventDefault();

    this.pointerUp();
    this.links.forEach(window => window.pointerUp());
  }

  pointerUp(): void {
    this.snapToNearestChoice();
    this.isDragged = false;
    this.el.classList.remove("proseplay-hover");

    let functionName = this.functionNames[this.currentChoiceIndex];
    if (functionName) {
      if (this.functions[functionName]) {
        this.functions[functionName]();
      }
    }

    (this.el.parentElement as HTMLElement).classList.remove("proseplay-has-hover");
  }

  setLink(linkIndex: number | null, otherWindows: Window[]): void {
    this.linkIndex = linkIndex;
    if (linkIndex) {
      const sup = linkRefTemplate.cloneNode(true) as HTMLElement;
      this.el.insertAdjacentElement("afterend", sup);
      sup.innerText = `${linkIndex}`;
    }
    this.links = otherWindows;
  }

  setFunctionNames(functionNames: string[]): void {
    this.functionNames = functionNames;
  }

  setFunction(name: string, fnc: Function): void {
    this.functions[name] = fnc;
  }
}

export { Window }