(function() {
  var GameBoyWithIO, formatError;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  window.MASK_FRAME_OVER = 0x1;
  window.MASK_STOPPED = 0x2;
  formatError = function(error) {
    return "" + error.fileName + ":" + error.lineNumber + " " + error.message;
  };
  window.GameBoyWithIO = GameBoyWithIO = (function() {
    function GameBoyWithIO() {
      this.settings = this.settings.slice();
      this.core = null;
      this.audioIndex = 0;
      window.settings = this.settings;
      window.audioOutputEvent = (__bind(function(event) {
        return this.handleAudioOutput(event);
      }, this));
    }
    GameBoyWithIO.prototype.start = function(canvas, canvasAlt, ROM) {
      this.clear();
      this.core = new GameBoyCore(canvas, canvasAlt, ROM);
      this.core.start();
      return this.run();
    };
    GameBoyWithIO.prototype.debug = function(s) {
      return cout(s, 0);
    };
    GameBoyWithIO.prototype.warn = function(s) {
      return cout(s, 1);
    };
    GameBoyWithIO.prototype.error = function(s) {
      return cout(s, 2);
    };
    GameBoyWithIO.prototype.continueCPU = function() {
      return this.core.run();
    };
    GameBoyWithIO.prototype.run = function() {
      if (this.core != null) {
        if (this.core.stopEmulator & MASK_STOPPED) {
          this.core.stopEmulator &= MASK_FRAME_OVER;
          this.core.lastIteration = new Date().getTime();
          this.debug("Starting the iterator.");
          return this.intervalId = setInterval((__bind(function() {
            return this.continueCPU();
          }, this)), this.settings[20]);
        } else if (!(this.core.stopEmulator & MASK_STOPPED)) {
          return this.warn("GameBoyCore is already running.");
        }
      } else {
        return this.warn("GameBoyCore cannot be run before being initialized.");
      }
    };
    GameBoyWithIO.prototype.pause = function() {
      if (this.core != null) {
        if (!(this.core.stopEmulator & MASK_STOPPED)) {
          return this.clear();
        } else if (this.core.stopEmulator & MASK_STOPPED) {
          return this.warn("GameBoyCore has already been paused.");
        }
      } else {
        return this.warn("GameBoyCore cannot be paused before being initialized.");
      }
    };
    GameBoyWithIO.prototype.clear = function() {
      if ((this.core != null) && !(this.core.stopEmulator & MASK_STOPPED)) {
        clearInterval(this.intervalId);
        this.core.stopEmulator |= MASK_STOPPED;
        return this.debug("The emulation has been cleared.");
      } else {
        return this.warn("No emulation found to clear.");
      }
    };
    GameBoyWithIO.prototype.save = function() {
      var listOfStates, stateName, stateSuffix;
      if (this.core != null) {
        try {
          stateSuffix = 0;
          while (findValue("" + this.core.name + "_" + stateSuffix)) {
            stateSuffix++;
          }
          stateName = "" + this.core.name + "_" + stateSuffix;
          setValue(stateName, this.core.saveState());
          if (!(findValue("state_names") != null)) {
            setValue("state_names", [stateName]);
          } else {
            listOfStates = findValue("state_names");
            listOfStates.push(stateName);
            setValue("state_names", listOfStates);
          }
          return addSaveStateItem(stateName);
        } catch (error) {
          return this.error("Error saving current emulation state: " + (formatError(error)));
        }
      } else {
        return this.warn("Uninitialized GameBoyCore has no state to save.");
      }
    };
    GameBoyWithIO.prototype.open = function(filename, canvas, canvasAlt) {
      try {
        if (findValue(filename)) {
          this.clear();
          this.debug("Attempting to run saved emulation state: " + filename);
          this.core = new GameBoyCore(canvas, canvasAlt, "");
          this.core.savedStateFileName = filename;
          this.core.returnFromState(findValue(filename));
          return this.run();
        } else {
          return this.error("Could not find save state: " + filename);
        }
      } catch (error) {
        return this.error("Error loading emulation state: " + (formatError(error)));
      }
    };
    GameBoyWithIO.prototype.mapKey = function(kb_key) {
      var index, _ref;
      for (index = 0, _ref = this.settings[3].length; (0 <= _ref ? index <= _ref : index >= _ref); (0 <= _ref ? index += 1 : index -= 1)) {
        if (this.settings[3][index] === kb_key) {
          return index;
        }
      }
      return null;
    };
    GameBoyWithIO.prototype.handleKeyDown = function(event) {
      var gb_keycode;
      if ((this.core != null) && !(this.core.stopEmulator & MASK_STOPPED)) {
        gb_keycode = this.mapKey(event.keyCode);
        if (gb_keycode != null) {
          this.core.JoyPadEvent(gb_keycode, true);
          try {
            return event.preventDefault();
          } catch (_e) {}
        } else {
          return this.debug("Press of unmapped key ignored.");
        }
      } else {
        return this.debug("Key press ignored since the GameBoyCore is not running.");
      }
    };
    GameBoyWithIO.prototype.handleKeyUp = function(event) {
      var gb_keycode;
      if ((this.core != null) && !(this.core.stopEmulator & MASK_STOPPED)) {
        gb_keycode = this.mapKey(event.keyCode);
        if (gb_keycode != null) {
          this.core.JoyPadEvent(gb_keycode, false);
          try {
            return event.preventDefault();
          } catch (_e) {}
        } else {
          return this.debug("Release of unmapped key ignored.");
        }
      } else {
        return this.debug("Key release ignored since the GameBoyCore is not running.");
      }
    };
    GameBoyWithIO.prototype.handleTilt = function(event) {};
    GameBoyWithIO.prototype.handleAudioOutput = function(event) {
      var buffer1, buffer2, bufferLength, count;
      count = 0;
      buffer1 = event.outputBuffer.getChannelData(0);
      buffer2 = event.outputBuffer.getChannelData(1);
      bufferLength = buffer1.length;
      if (this.settings[0] && (this.core != null) && !(this.core.stopEmulator & MASK_STOPPED) && this.core.soundMasterEnabled) {
        if (this.settings[1]) {
          while (count < bufferLength) {
            buffer2[count] = buffer1[count] = this.core.audioSamples[this.audioIndex++];
            if (this.audioIndex >= this.core.numSamplesTotal) {
              this.audioIndex = 0;
            }
            count++;
          }
        } else {
          while (count < bufferLength) {
            buffer1[count] = this.core.audioSamples[this.audioIndex++];
            if (this.audioIndex >= this.core.numSamplesTotal) {
              this.audioIndex = 0;
            }
            buffer2[count] = this.core.audioSamples[this.audioIndex++];
            if (this.audioIndex >= this.core.numSamplesTotal) {
              this.audioIndex = 0;
            }
            count++;
          }
        }
      } else {
        this.audioIndex = this.core.audioIndex = 0;
        while (count < this.settings[18]) {
          buffer2[count] = buffer1[count] = 0;
          count++;
        }
      }
      return null;
    };
    GameBoyWithIO.prototype.settings = [true, false, false, [39, 37, 38, 40, 88, 90, 16, 13], 0, false, [16, 12], true, 29, false, false, 20, 10, 17826, 70000, 0x10, true, true, 512, false, 17, false, false];
    return GameBoyWithIO;
  })();
}).call(this);
