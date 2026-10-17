import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { Body, Button, Card, FeedbackList, Input, Option, Screen, Subtitle } from '../components/ui';
import { INTERVIEW_QUESTIONS } from '../content';
import { evaluateAnswer } from '../logic/feedback';
import { recordSession } from '../logic/progress';
import { useProgress } from '../store/ProgressContext';

export default function InterviewScreen() {
  const [question, setQuestion] = useState(null);

  if (!question) {
    return (
      <Screen>
        <Body muted>
          Elige una pregunta típica de entrevista para trabajo remoto. Escribe tu respuesta en inglés y
          recibe feedback al instante.
        </Body>
        <Button
          title="Pregunta aleatoria"
          icon="🎲"
          onPress={() => setQuestion(INTERVIEW_QUESTIONS[Math.floor(Math.random() * INTERVIEW_QUESTIONS.length)])}
        />
        {INTERVIEW_QUESTIONS.map((q) => (
          <Option key={q.id} label={`${q.category}\n${q.question}`} onPress={() => setQuestion(q)} />
        ))}
      </Screen>
    );
  }
  return <Practice key={question.id} question={question} onOther={() => setQuestion(null)} />;
}

function Practice({ question, onOther }) {
  const { update } = useProgress();
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const started = useRef(Date.now());

  const evaluate = () => {
    const fb = evaluateAnswer(question, answer);
    setFeedback(fb);
    update((s) =>
      recordSession(s, {
        mode: 'interview', score: fb.score, total: 10, xp: fb.score * 2,
        durationSec: Math.round((Date.now() - started.current) / 1000),
      }),
    );
  };

  return (
    <Screen>
      <Card>
        <Body muted>🧑‍💼 Interviewer · {question.category}</Body>
        <Subtitle style={{ marginTop: 4 }}>{question.question}</Subtitle>
      </Card>
      <Card tone="warning">
        <Body>💡 {question.tip_es}</Body>
      </Card>
      <Input
        multiline
        value={answer}
        onChangeText={setAnswer}
        editable={!feedback}
        placeholder="Write your answer in English…"
        autoCapitalize="sentences"
      />
      {!feedback ? (
        <Button title="Evaluar mi respuesta" disabled={!answer.trim()} onPress={evaluate} />
      ) : (
        <>
          <FeedbackList feedback={feedback} />
          <Body muted style={{ textAlign: 'center' }}>+{feedback.score * 2} XP</Body>
          <Card tone="success">
            <Subtitle>📝 Respuesta modelo</Subtitle>
            <Body style={{ marginTop: 6 }}>{question.sample}</Body>
          </Card>
          <Button title="Practicar otra pregunta" onPress={onOther} />
          <Button title="Volver al inicio" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
