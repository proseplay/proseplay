const choiceTemplate = document.createElement("div");
choiceTemplate.classList.add("proseplay__choice");

class Choice {
  el: HTMLElement;
  text: string = "";
  isCurrent: boolean = false;

  constructor(text: string) {
    this.text = text;

    this.el = choiceTemplate.cloneNode(true) as HTMLElement;
    if (text !== " ") {
      this.el.innerText = text;
    } else {
      this.el.innerHTML = "&thinsp;";
    }
  }

  /**
   * Activate this choice.
   */
  activate() {
    this.isCurrent = true;
    this.el.classList.add("proseplay__current");
  }
  
  /**
   * Deactivate this choice.
   */
  deactivate() {
    this.isCurrent = false;
    this.el.classList.remove("proseplay__current");
  }

  /**
   * Get the `offsetTop` of this element.
   */
  get offsetTop(): number {
    return this.el.offsetTop;
  }

  /**
   * Get the `offsetLeft` of this element.
   */
  get offsetLeft(): number {
    return this.el.offsetLeft;
  }

  /**
   * Get the `offsetWidth` of this element.
   */
  get offsetWidth(): number {
    return this.el.offsetWidth;
  }
}

export { Choice }