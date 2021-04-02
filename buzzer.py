import RPi.GPIO as GPIO
import sys, time, os
import signal 
from datetime import datetime
 
class RFIDReader():
	def __init__(self):
		self.continue_reading = True;
		GPIO.setmode(GPIO.BCM) ## Use board pin numbering
        def buzz(self):
           #GPIO.setwarnings(False) GPIO.setmode(GPIO.BOARD)
           GPIO.setup(26,GPIO.OUT)
           pitches=[2500]
           duration=[0.1]
           #pitches=[1823, 1764,1435] duration=[0.1,0.1,0.2]
           x=0
           for pitch in pitches:
              if(pitch==0):
                 time.sleep(duration[0])
                 return
              period = 1.0 / pitch
              delay = period / 2
              cycles = int(duration[x] * pitch)
              for i in range(cycles):
                 GPIO.output(26, True)
                 time.sleep(delay)
                 GPIO.output(26, False)
                 time.sleep(delay)
              x+=1
			
 
if __name__ == "__main__":
        buzzer = RFIDReader()
        buzzer.buzz()
        GPIO.cleanup()
        sys.exit(2)
