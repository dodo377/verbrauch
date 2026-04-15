import { gql } from 'urql';

// Entspricht exakt unserem Backend-Schema!
export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        username
      }
    }
  }
`;
export const ADD_READING = gql`
  mutation AddReading($type: ReadingType!, $value: Float!, $note: String) {
    addReading(type: $type, value: $value, note: $note) {
      id
      type
      value
      timestamp
      note
    }
  }
`;

export const UPDATE_READING_NOTE = gql`
  mutation UpdateReadingNote($id: ID!, $note: String!) {
    updateReadingNote(id: $id, note: $note) {
      id
      note
    }
  }
`;

export const UPDATE_READING = gql`
  mutation UpdateReading($id: ID!, $value: Float, $note: String, $subtype: String, $timestamp: String) {
    updateReading(id: $id, value: $value, note: $note, subtype: $subtype, timestamp: $timestamp) {
      id
      type
      value
      timestamp
      note
      subtype
    }
  }
`;

export const DELETE_READING = gql`
  mutation DeleteReading($id: ID!) {
    deleteReading(id: $id)
  }
`;

export const ADD_VACATION_PERIOD = gql`
  mutation AddVacationPeriod($startDate: String!, $endDate: String!, $note: String) {
    addVacationPeriod(startDate: $startDate, endDate: $endDate, note: $note) {
      id
      startDate
      endDate
      note
    }
  }
`;

export const DELETE_VACATION_PERIOD = gql`
  mutation DeleteVacationPeriod($id: ID!) {
    deleteVacationPeriod(id: $id)
  }
`;