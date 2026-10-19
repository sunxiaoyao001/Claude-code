// Camera page (resident). M0 ships an empty viewfinder shell that proves the build and tokens;
// the camera component, FrameFeed and the WebGL canvas arrive in M1.
Page({
  data: {
    // Shown so real-device checks can report the base library without digging through menus.
    sdkVersion: '',
  },

  onLoad() {
    // wx.getAppBaseInfo: base library >= 2.20.1, below our 3.0.0 floor.
    this.setData({ sdkVersion: wx.getAppBaseInfo().SDKVersion });
  },
});
