// Bottom sheet for the privacy agreement. Presentation only: PrivacyGate owns the flow, the hosting
// page forwards `agree` / `disagree` to it.
Component({
  options: {
    addGlobalClass: true,
  },

  properties: {
    visible: { type: Boolean, value: false },
    contractName: { type: String, value: '' },
  },

  methods: {
    onAgree() {
      this.triggerEvent('agree');
    },

    onDisagree() {
      this.triggerEvent('disagree');
    },

    onOpenContract() {
      this.triggerEvent('opencontract');
    },

    noop() {
      // Swallows touchmove so the page underneath does not scroll.
    },
  },
});
