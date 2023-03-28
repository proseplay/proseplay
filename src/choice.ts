const choiceTemplate = document.createElement("div");
choiceTemplate.classList.add("proseplay-choice");

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
      this.el.innerHTML = "&hairsp;";
    }
  }

  activate() {
    this.isCurrent = true;
    this.el.classList.add("proseplay-current");
  }
  
  deactivate() {
    this.isCurrent = false;
    this.el.classList.remove("proseplay-current");
  }

  get offsetTop(): number {
    return this.el.offsetTop;
  }

  get offsetLeft(): number {
    return this.el.offsetLeft;
  }

  get offsetWidth(): number {
    return this.el.offsetWidth;
  }
}

export { Choice }