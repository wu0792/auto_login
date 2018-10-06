import sys
import pytesseract
from PIL import Image, ImageEnhance

args = sys.argv

img = Image.open(args[1])

img1 = ImageEnhance.Brightness(img).enhance(2.0)

str = pytesseract.image_to_string(
    img1, lang='eng', config='-psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
print(str)
