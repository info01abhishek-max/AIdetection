import requests
import json

# Test health endpoint
print('Testing health endpoint...')
r = requests.get('http://localhost:8000/api/health')
print(f'Health: {r.status_code} - {r.json()}')

# Test text analysis
print('\nTesting text analysis...')
r = requests.post('http://localhost:8000/api/analyze/text', json={'text': 'This is a test sentence to check if the text detection API works properly. It should analyze the text and return results synchronously now.'})
print(f'Analyze text: {r.status_code} - {r.json()}')

analysis_id = r.json()['analysis_id']

# Get result directly (since it's now synchronous)
print('\nGetting result...')
r = requests.get(f'http://localhost:8000/api/analysis/{analysis_id}/result')
print(f'Result: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    assessment = data['overall_assessment']
    ai_prob = data['ai_generated_probability']
    conf = data['confidence']
    print(f'  Assessment: {assessment}')
    print(f'  AI Probability: {ai_prob}')
    print(f'  Confidence: {conf}')
    print(f'  Detectors: {len(data["detectors"])}')
    for d in data['detectors']:
        print(f'    - {d["name"]}: {d["label"]} ({d["confidence"]:.1f}%)')
else:
    print(f'  Error: {r.text}')