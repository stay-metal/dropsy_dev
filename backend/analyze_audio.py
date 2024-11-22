import sys
import json
import numpy as np
from panns_inference import AudioTagging, labels
import torch
import warnings
import librosa
from contextlib import redirect_stdout
import os

warnings.filterwarnings("ignore")

def analyze_audio(file_path):
    # Загрузка путей к модели и меткам классов из переменных окружения
    model_path = os.getenv('MODEL_PATH', '/app/models/Cnn14_mAP=0.431.pth')
    class_labels_path = os.getenv('CLASS_LABELS_PATH', '/app/models/class_labels_indices.csv')

    # Загрузка меток классов
    try:
        with open(class_labels_path, 'r', encoding='utf-8') as f:
            labels_list = [line.strip() for line in f.readlines()]
    except Exception as e:
        print(f"Error loading class labels: {e}", file=sys.stderr)
        return {"error": f"Error loading class labels: {e}"}
    
    # Инициализация модели
    with redirect_stdout(sys.stderr):
        at = AudioTagging(checkpoint_path=model_path, device='cpu')
    
    print("Using CPU.", file=sys.stderr)
    
    # Загрузка аудиофайла с использованием librosa
    y, sr = librosa.load(file_path, sr=32000, mono=True)
    
    audio_data = y[np.newaxis, :]  # Форматирование данных
    
    print(f"Audio data type: {type(audio_data)}", file=sys.stderr)
    print(f"Audio data shape: {audio_data.shape}", file=sys.stderr)
    print(f"Sample rate: {sr}", file=sys.stderr)
    
    # Определение BPM
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    print(f"Estimated BPM: {tempo}", file=sys.stderr)
    tempo = float(tempo)
    
    # Инференс
    try:
        (clipwise_output, embedding) = at.inference(audio_data)
    except Exception as e:
        print(f"Error during inference: {e}", file=sys.stderr)
        return {"error": str(e)}
    
    top_N = 10
    clipwise_output = clipwise_output[0]
    sorted_indexes = np.argsort(-clipwise_output)
    top_labels = [labels_list[idx] for idx in sorted_indexes[:top_N]]
    top_probs = [float(clipwise_output[idx]) for idx in sorted_indexes[:top_N]]
    
    instruments_of_interest = [
        'Electric guitar', 'Bass guitar', 'Drum', 'Drum kit', 'Vocals', 'Voice', 'Keyboard', 'Synthesizer'
    ]
    
    detected_instruments = []
    for idx in sorted_indexes[:top_N]:
        label = labels_list[idx]
        probability = float(clipwise_output[idx])
        if any(instr.lower() in label.lower() for instr in instruments_of_interest):
            detected_instruments.append({
                'instrument': label,
                'probability': probability
            })
    
    result = {
        "detected_instruments": detected_instruments,
        "bpm": tempo
    }
    
    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python analyze_audio.py <file_path>", file=sys.stderr)
        sys.exit(1)
    file_path = sys.argv[1]
    analysis_result = analyze_audio(file_path)
    print(json.dumps(analysis_result, ensure_ascii=False, indent=4))