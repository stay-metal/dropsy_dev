import librosa

file_path = 'VoxBelkin_01.wav'

try:
    y, sr = librosa.load(file_path, sr=32000, mono=True)
    print(f"Audio data type: {type(y)}")
    print(f"Audio data shape: {y.shape}")
    print(f"Sample rate: {sr}")
except Exception as e:
    print(f"Error loading audio file: {e}")