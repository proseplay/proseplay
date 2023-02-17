class Choice {
  static template: HTMLElement;
  el: HTMLElement;
  text: string;
  isCurrent: boolean;

  static {
    Choice.template = document.createElement("div");
    Choice.template.classList.add("proseplay-choice");
  }

  constructor(text: string) {
    this.text = text;
    this.isCurrent = false;

    this.el = Choice.template.cloneNode(true) as HTMLElement;
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
}

export { Choice }