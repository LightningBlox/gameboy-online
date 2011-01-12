# globals expected:
# - GameBoyCore
# - cout
# - setValue
# - findValue
# - addSaveStateItem
# 
# Ideally as many of these as possible will be eliminated.
# 
# globals defined:
# - GameBoyWithIO
# - settings (aliasing property on instantiation)
# - audioOutputEvent (aliasing method on instantiation)

# bitmasks for GameBoyCore().stopEmulator:
window.MASK_FRAME_OVER = 0x1
window.MASK_STOPPED = 0x2

formatError = (error) ->
    "#{error.fileName}:#{error.lineNumber} #{error.message}"

window.GameBoyWithIO = class GameBoyWithIO
    constructor: ->
        @settings = @settings.slice() # clone own settings from default
        @core = null
        @audioIndex = 0
        
        # Though I made a class the core uses global variables that prevent this from actually
        # being modular, so I create them from this instance when created
        window.settings = @settings
        window.audioOutputEvent = ((event) => @handleAudioOutput event)
    
    start: (canvas, canvasAlt, ROM) ->
        @clear()
        @core = new GameBoyCore canvas, canvasAlt, ROM
        @core.start()
        @run()
    
    debug: (s) -> cout s, 0
    warn: (s) -> cout s, 1
    error: (s) -> cout s, 2
    
    continueCPU: -> @core.run()
    
    run: ->
        if @core?
            if @core.stopEmulator & MASK_STOPPED
                @core.stopEmulator &= MASK_FRAME_OVER
                @core.lastIteration = new Date().getTime()
                @debug "Starting the iterator."
                @intervalId = setInterval (=> @continueCPU()), @settings[20]
            else if not (@core.stopEmulator & MASK_STOPPED)
                @warn "GameBoyCore is already running."
        else
            @warn "GameBoyCore cannot be run before being initialized."
    
    pause: ->
        if @core?
            if not (@core.stopEmulator & MASK_STOPPED)
                @clear()
            else if @core.stopEmulator & MASK_STOPPED
                @warn "GameBoyCore has already been paused."
        else
            @warn "GameBoyCore cannot be paused before being initialized."
    
    clear: ->
        if @core? and not (@core.stopEmulator & MASK_STOPPED)
            clearInterval @intervalId
            @core.stopEmulator |= MASK_STOPPED
            @debug "The emulation has been cleared."
        else
            @warn "No emulation found to clear."
    
    save: ->
        if @core?
            try
                stateSuffix = 0
                
                while findValue "#{@core.name}_#{stateSuffix}"
                    stateSuffix++
                
                stateName = "#{@core.name}_#{stateSuffix}"
                
                setValue stateName, @core.saveState()
                
                if not findValue("state_names")?
                    setValue "state_names", [stateName]
                else
                    listOfStates = findValue "state_names"
                    listOfStates.push stateName
                    setValue "state_names", listOfStates
                
                addSaveStateItem stateName
            catch error
                @error "Error saving current emulation state: #{formatError error}"
        else
            @warn "Uninitialized GameBoyCore has no state to save."
    
    open: (filename, canvas, canvasAlt) ->
        try
            if findValue filename
                @clear()
                @debug "Attempting to run saved emulation state: #{filename}"
                @core = new GameBoyCore canvas, canvasAlt, ""
                @core.savedStateFileName = filename
                @core.returnFromState findValue filename
                @run()
            else
                @error "Could not find save state: #{filename}"
        catch error
            @error "Error loading emulation state: #{formatError error}"
    
    mapKey: (kb_key) ->
        # maps a keyboard key to a gameboy key
        # indicies: [Right, Left, Up, Down, A, B, Start, Select]
        
        for index in [0..@settings[3].length]
            if @settings[3][index] == kb_key
                return index
        
        return null
    
    # Note that these are all bound upon instantiation (-> instead of ->)
    
    handleKeyDown: (event) ->
        if @core? and not(@core.stopEmulator & MASK_STOPPED)
            gb_keycode = @mapKey event.keyCode
            
            if gb_keycode?
                @core.JoyPadEvent gb_keycode, true
                
                try event.preventDefault()
            else
                @debug "Press of unmapped key ignored."
        else
            @debug "Key press ignored since the GameBoyCore is not running."
    
    handleKeyUp: (event) ->
        if @core? and not(@core.stopEmulator & MASK_STOPPED)
            gb_keycode = @mapKey event.keyCode
            
            if gb_keycode?
                @core.JoyPadEvent gb_keycode, false
                
                try event.preventDefault()
            else
                @debug "Release of unmapped key ignored."
        else
            @debug "Key release ignored since the GameBoyCore is not running."
    
    handleTilt: (event) ->
        # TODO, for games like Kirby's Tilt n Tumble
    
    handleAudioOutput: (event) ->
        count = 0
        buffer1 = event.outputBuffer.getChannelData 0
        buffer2 = event.outputBuffer.getChannelData 1
        
        bufferLength = buffer1.length
        
        if @settings[0] and @core? and not (@core.stopEmulator & MASK_STOPPED) and @core.soundMasterEnabled
            if @settings[1] # MONO
                while count < bufferLength
                    buffer2[count] = buffer1[count] = @core.audioSamples[@audioIndex++]
                    
                    if @audioIndex >= @core.numSamplesTotal
                        @audioIndex = 0
                    
                    count++
            else # STEREO
                while count < bufferLength
                    buffer1[count] = @core.audioSamples[@audioIndex++]
                    
                    if @audioIndex >= @core.numSamplesTotal
                        @audioIndex = 0
                    
                    buffer2[count] = @core.audioSamples[@audioIndex++]
                    
                    if @audioIndex >= @core.numSamplesTotal
                        @audioIndex = 0
                    
                    count++
        else
            @audioIndex = @core.audioIndex = 0
            while count < @settings[18]
                buffer2[count] = buffer1[count] = 0
                count++
    
    settings: [ # default settings, cloned upon instantiation
        	true, 								# Turn on sound.
        	false,								# Force Mono sound.
        	false,								# Give priority to GameBoy mode
        	[39, 37, 38, 40, 88, 90, 16, 13],	# Keyboard button map.
        	0,									# Frameskip Amount (Auto frameskip setting allows the script to change this.)
        	false,								# Use the data URI BMP method over the canvas tag method?
        	[16, 12],							# How many tiles in each direction when using the BMP method (width * height).
        	true,								# Auto Frame Skip
        	29,									# Maximum Frame Skip
        	false,								# Override to allow for MBC1 instead of ROM only (compatibility for broken 3rd-party cartridges).
        	false,								# Override MBC RAM disabling and always allow reading and writing to the banks.
        	20,									# Audio granularity setting (Sampling of audio every x many machine cycles)
        	10,									# Frameskip base factor
        	17826,								# Target number of machine cycles per loop. (4,194,300 / 1000 * 17)
        	70000,								# Sample Rate
        	0x10,								# How many bits per WAV PCM sample (For browsers that fall back to WAV PCM generation)
        	true,								# Use the GBC BIOS?
        	true,								# Colorize GB mode?
        	512,								# Sample size for webkit audio.
        	false,								# Whether to display the canvas at 144x160 on fullscreen or as stretched.
        	17,									# Interval for the emulator loop.
        	false,								# Render nearest-neighbor scaling in javascript?
        	false								# Disallow typed arrays?
    ]
